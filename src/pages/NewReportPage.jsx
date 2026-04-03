import React, { useState, Fragment, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { submitFloodReport, uploadReportImage, fetchFloodData } from '../services/api';
import { isAuthenticated, getCurrentUser } from '../utils/auth';
import { DEFAULT_CENTER, DEFAULT_ZOOM, statusColors } from '../utils/constants';
import { getSensorDisplayPosition } from '../data/sensorOverrides';
import SensorMarker from '../components/map/SensorMarker';
import { 
  FaPenToSquare,
  FaCheck,
  FaXmark,
  FaClock,
  FaPaperPlane,
  FaMap,
  FaTrash,
  FaImage,
  FaBullseye
} from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdAddLocation, MdLocationOn, MdLightbulb } from 'react-icons/md';
import ErrorToast from '../components/common/ErrorToast';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
// Mapbox: [lng, lat]; DEFAULT_CENTER là [lat, lng]
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

const NewReportPage = () => {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const currentUser = getCurrentUser();
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    lng: null,
    lat: null
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locationDescription, setLocationDescription] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [content, setContent] = useState('');
  const [photoList, setPhotoList] = useState([]);
  
  // Load cache từ localStorage
  const [locationCache] = useState(() => {
    try {
      const saved = localStorage.getItem('locationCache');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Flood level options for Combobox
  const floodLevelOptions = [
    { id: '', name: '-- Chọn mức độ --' },
    { id: 'Nhẹ', name: 'Nhẹ (đến mắt cá ~10cm)' },
    { id: 'Trung bình', name: 'Trung bình (đến đầu gối ~30cm)' },
    { id: 'Nặng', name: 'Nặng (ngập nửa xe ~50cm)' },
  ];
  
  const selectedLevel = floodLevelOptions.find(opt => opt.id === formData.level) || floodLevelOptions[0];
  const [levelQuery, setLevelQuery] = useState('');
  
  const filteredLevels =
    levelQuery === ''
      ? floodLevelOptions
      : floodLevelOptions.filter((option) =>
          option.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(levelQuery.toLowerCase().replace(/\s+/g, ''))
        );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Khách phải nhập tên; user đăng nhập không gửi name (BE lấy từ tài khoản)
    if (!authenticated && (!formData.name || formData.name.trim().length < 2)) {
      setError('Vui lòng nhập tên của bạn (ít nhất 2 ký tự) hoặc đăng nhập để dùng tên tài khoản.');
      return;
    }

    if (!['Nhẹ', 'Trung bình', 'Nặng'].includes(formData.level)) {
      setError('Vui lòng chọn mức độ ngập hợp lệ');
      return;
    }

    if (!formData.lng || !formData.lat) {
      setError('Vui lòng chọn vị trí trên bản đồ (click vào bản đồ)');
      return;
    }

    setLoading(true);
    try {
      const photoUrls = [];
      for (const item of photoList) {
        const uploadResult = await uploadReportImage(item.file);
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Tải ảnh lên thất bại');
          setLoading(false);
          return;
        }
        photoUrls.push(uploadResult.photo_url);
      }
      const payload = {
        level: formData.level,
        lng: formData.lng,
        lat: formData.lat,
        ...(locationDescription && { location_description: locationDescription }),
        ...(content.trim() && { content: content.trim() }),
        ...(photoUrls.length > 0 && { photo_url: photoUrls[0], photo_urls: photoUrls })
      };
      if (photoUrls.length === 0) delete payload.photo_urls;
      if (!authenticated) payload.name = formData.name.trim();
      const response = await submitFloodReport(payload);

      if (response.success) {
        setResult(response);
        setTimeout(() => navigate('/reports'), 2000);
      } else {
        setError(response.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError(err?.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const MAX_PHOTOS = 5;
  const handlePhotoChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setError(null);
    const valid = files.filter(f => f.type.startsWith('image/'));
    if (valid.length < files.length) setError('Một số file không phải ảnh đã bỏ qua.');
    const toAdd = valid.slice(0, MAX_PHOTOS - photoList.length).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setPhotoList(prev => [...prev, ...toAdd].slice(0, MAX_PHOTOS));
    e.target.value = '';
  };
  const removePhoto = (id) => {
    setPhotoList(prev => {
      const item = prev.find(p => p.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };
  const clearAllPhotos = () => {
    photoList.forEach(p => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    setPhotoList([]);
  };

  // Hàm format địa chỉ từ reverse geocoding
  const formatAddress = (data) => {
    if (!data) return null;
    
    // Ưu tiên dùng display_name và parse lại để lấy địa chỉ chính xác
    if (data.display_name) {
      const displayParts = data.display_name.split(',').map(s => s.trim());
      
      // Tìm phần có chứa "Đường" hoặc tên đường
      const roadIndex = displayParts.findIndex(p => 
        p.toLowerCase().includes('đường') || 
        p.toLowerCase().includes('street') ||
        /^\d+\s+(tháng|thang)/i.test(p) || // Đường 3 tháng 2, đường 2 tháng 2
        /đường\s+\d+/i.test(p)
      );
      
      if (roadIndex !== -1) {
        // Lấy từ phần đường và 2-3 phần sau đó (thường là phường, quận)
        const addressParts = displayParts.slice(roadIndex, roadIndex + 3);
        // Loại bỏ các phần không cần thiết như "Thành phố Thủ Đức", "Vietnam"
        const filteredParts = addressParts.filter(p => 
          !p.toLowerCase().includes('thành phố thủ đức') &&
          !p.toLowerCase().includes('vietnam') &&
          !p.toLowerCase().includes('việt nam')
        );
        if (filteredParts.length > 0) {
          return filteredParts.join(', ');
        }
      }
      
      // Nếu không tìm thấy đường, lấy 3 phần đầu và loại bỏ phần không cần thiết
      const firstParts = displayParts.slice(0, 4).filter(p => 
        !p.toLowerCase().includes('thành phố thủ đức') &&
        !p.toLowerCase().includes('vietnam') &&
        !p.toLowerCase().includes('việt nam') &&
        !p.toLowerCase().includes('ho chi minh city')
      );
      if (firstParts.length > 0) {
        return firstParts.join(', ');
      }
    }
    
    // Fallback: dùng address object nếu có
    if (data.address) {
      const addr = data.address;
      const parts = [];
      
      // Ưu tiên: số nhà > tên đường > phường > quận
      if (addr.house_number) {
        parts.push(addr.house_number);
      }
      if (addr.road) {
        parts.push(addr.road);
      }
      if (addr.ward) {
        parts.push(`Phường ${addr.ward}`);
      }
      if (addr.district && !addr.district.includes('Thủ Đức')) {
        parts.push(`Quận ${addr.district}`);
      }
      
      // Chỉ thêm city nếu không phải Thủ Đức
      if (addr.city && !addr.city.includes('Thủ Đức')) {
        parts.push(addr.city);
      }
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return null;
  };

  // Hàm lấy địa chỉ từ tọa độ với cache
  const fetchLocationDescription = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    // Kiểm tra cache trước
    if (locationCache[cacheKey]) {
      setLocationDescription(locationCache[cacheKey]);
      return locationCache[cacheKey];
    }
    
    setFetchingLocation(true);
    
    try {
      // Dùng zoom level cao hơn để lấy thông tin chi tiết hơn
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi&extratags=1`,
        {
          headers: {
            'User-Agent': 'HCM-Flood-Frontend/1.0'
          }
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Debug: log dữ liệu để kiểm tra
      
      const formattedAddress = formatAddress(data);
      
      if (formattedAddress) {
        // Lưu vào cache (localStorage)
        const newCache = { ...locationCache, [cacheKey]: formattedAddress };
        try {
          localStorage.setItem('locationCache', JSON.stringify(newCache));
        } catch {
          // Quota or private mode — in-memory flow still works
        }
        
        setLocationDescription(formattedAddress);
        return formattedAddress;
      }
      
      return null;
    } catch {
      return null;
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleLocationSelect = async (lng, lat) => {
    setFormData({ ...formData, lng, lat });
    setError(null);
    setLocationDescription(null); // Reset địa chỉ cũ
    
    // Fetch địa chỉ mới
    await fetchLocationDescription(lat, lng);
  };

  const handleRemoveMarker = () => {
    setFormData({ ...formData, lng: null, lat: null });
    setLocationDescription(null);
    setError(null);
    setMapCenter(null);
  };

  // Hàm tìm kiếm địa chỉ (forward geocoding)
  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) {
      setError('Vui lòng nhập địa chỉ cần tìm');
      return;
    }

    setSearchingAddress(true);
    setError(null);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=5&addressdetails=1&accept-language=vi&countrycodes=vn`,
        {
          headers: {
            'User-Agent': 'HCM-Flood-Frontend/1.0'
          }
        }
      );

      if (!response.ok) {
        setError('Không thể tìm kiếm địa chỉ');
        return;
      }

      const data = await response.json();

      if (data.length === 0) {
        setError('Không tìm thấy địa chỉ. Vui lòng thử lại với từ khóa khác.');
        return;
      }

      // Nếu chỉ có 1 kết quả, tự động chọn luôn
      if (data.length === 1) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setFormData({ ...formData, lat, lng });
        setSearchAddress('');
        setSearchResults([]);
        // Di chuyển map đến vị trí mới
        setMapCenter([lat, lng]);
        // Fetch địa chỉ chi tiết
        await fetchLocationDescription(lat, lng);
      } else {
        // Nếu có nhiều kết quả, hiển thị để người dùng chọn
        setSearchResults(data);
      }
    } catch {
      setError('Lỗi kết nối khi tìm kiếm địa chỉ');
    } finally {
      setSearchingAddress(false);
    }
  };

  // Hàm chọn kết quả tìm kiếm
  const handleSelectSearchResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setFormData({ ...formData, lat, lng });
    setSearchAddress('');
    setSearchResults([]);
    // Di chuyển map đến vị trí mới
    setMapCenter([lat, lng]);
    // Fetch địa chỉ chi tiết
    await fetchLocationDescription(lat, lng);
  };
  
  // State để điều khiển map view
  const [mapCenter, setMapCenter] = useState(null);
  const mapRef = useRef(null);
  const endpointRef = useRef(null);
  const [sensorViewState, setSensorViewState] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [hoveredSensorId, setHoveredSensorId] = useState(null);

  // Zoom map đúng vùng gần các sensor: fetch flood data, lưu danh sách sensor + tính bounds để fit
  useEffect(() => {
    let cancelled = false;
    fetchFloodData(endpointRef).then((res) => {
      if (cancelled || !res.success || !res.data?.length) return;
      const list = res.data.filter((s) => s.lat != null && s.lng != null);
      if (list.length === 0) return;
      setSensors(list);
      const points = list.map((s) => getSensorDisplayPosition(s));
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const pad = 0.003;
      setSensorViewState({
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom: 14,
        bounds: [
          [minLng - pad, minLat - pad],
          [maxLng + pad, maxLat + pad]
        ]
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Mapbox: fly to mapCenter khi chọn vị trí hoặc tìm kiếm địa chỉ
  useEffect(() => {
    if (mapCenter && mapRef.current) {
      mapRef.current.flyTo({ center: [mapCenter[1], mapCenter[0]], zoom: 16, duration: 1000 });
    }
  }, [mapCenter]);

  const hasFittedSensorBounds = useRef(false);
  // Fit bounds theo sensor khi map đã load (zoom vào vùng sensor để người dùng dễ biết)
  useEffect(() => {
    if (hasFittedSensorBounds.current || !sensorViewState?.bounds) return;
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map?.fitBounds) return;
    hasFittedSensorBounds.current = true;
    map.fitBounds(sensorViewState.bounds, { padding: 50, duration: 800, maxZoom: 15 });
  }, [sensorViewState]);

  const handleCancel = () => {
    navigate('/reports');
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)', // Subtract header height
      background: '#f5f5f5',
      padding: '20px'
    }}>
      {error && (
        <ErrorToast message={error} onClose={() => setError(null)} />
      )}
      {/* Page Title */}
      <div style={{
        backgroundImage: 'url(/add_report.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px 40px'
      }}>
        <h1 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '2rem', 
          color: 'white', 
          fontWeight: '700', 
          letterSpacing: '0.5px',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 1
        }}>
          Báo cáo ngập lụt
        </h1>
        <p style={{ 
          margin: '0', 
          color: 'rgba(255, 255, 255, 0.95)', 
          fontSize: '15px',
          fontWeight: '400',
          lineHeight: '1.6',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 1
        }}>
          Giúp cộng đồng cập nhật tình trạng ngập lụt
        </p>
      </div>

      {/* Form Container */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* Form */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <form onSubmit={handleSubmit}>
              {/* Tên: chỉ khách nhập; user đăng nhập dùng tên tài khoản */}
              {authenticated ? (
                <div style={{
                  marginBottom: '16px',
                  padding: '10px 12px',
                  background: '#f0f9ff',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#0369a1'
                }}>
                  Báo cáo sẽ hiển thị với tên: <strong>{currentUser?.full_name || currentUser?.username || 'Bạn'}</strong>
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '13px'
                  }}>
                    Tên người báo cáo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    required
                    minLength={2}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px'
                }}>
                  Mức độ ngập *
                </label>
                <div className="relative">
                  <Combobox value={selectedLevel} onChange={(option) => {
                    setFormData({ ...formData, level: option.id });
                  }}>
                    <div className="relative mt-1">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border border-gray-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 text-xs">
                        <Combobox.Input
                          className="w-full border-none py-2 pl-3 pr-10 text-xs leading-4 text-gray-900 focus:ring-0 focus:outline-none cursor-pointer"
                          displayValue={(option) => option.name}
                          onChange={(event) => setLevelQuery(event.target.value)}
                          onClick={(e) => {
                            e.target.select();
                          }}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 focus:outline-none outline-none border-none bg-transparent">
                          <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400 pointer-events-none"
                            aria-hidden="true"
                          />
                        </Combobox.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setLevelQuery('')}
                      >
                        <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black/5 focus:outline-none">
                          {filteredLevels.length === 0 && levelQuery !== '' ? (
                            <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                              Không tìm thấy.
                            </div>
                          ) : (
                            filteredLevels.map((option) => (
                              <Combobox.Option
                                key={option.id}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                  }`
                                }
                                value={option}
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span
                                      className={`block truncate ${
                                        selected ? 'font-medium' : 'font-normal'
                                      }`}
                                    >
                                      {option.name}
                                    </span>
                                    {selected ? (
                                      <span
                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                          active ? 'text-white' : 'text-blue-600'
                                        }`}
                                      >
                                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Combobox.Option>
                            ))
                          )}
                        </Combobox.Options>
                      </Transition>
                    </div>
                  </Combobox>
                </div>
              </div>

              {/* Nội dung mô tả mức độ ngập (optional) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px'
                }}>
                  Nội dung mô tả mức độ ngập (tùy chọn)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="VD: Nước ngập đến bánh xe, không di chuyển được..."
                  rows={3}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    resize: 'vertical',
                    minHeight: '72px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{content.length}/500 ký tự</div>
              </div>

              {/* Hình ảnh hiện trường (optional, tối đa 5 ảnh) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px'
                }}>
                  <FaImage style={{ marginRight: '6px' }} /> Hình ảnh hiện trường (tùy chọn, tối đa {MAX_PHOTOS} ảnh)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                  id="report-photo-input"
                />
                <div className="report-photos-section">
                  {photoList.length < MAX_PHOTOS && (
                    <label
                      htmlFor="report-photo-input"
                      className="report-photo-add-btn"
                    >
                      <FaImage style={{ fontSize: '20px', marginBottom: '4px' }} />
                      <span>Chọn ảnh</span>
                    </label>
                  )}
                  {photoList.length > 0 && (
                    <div className="report-photos-grid">
                      {photoList.map((item) => (
                        <div key={item.id} className="report-photo-item">
                          <img src={item.previewUrl} alt="Preview" />
                          <button
                            type="button"
                            className="report-photo-remove"
                            onClick={() => removePhoto(item.id)}
                            title="Xóa ảnh"
                            aria-label="Xóa ảnh"
                          >
                            <FaXmark style={{ fontSize: '14px' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoList.length > 0 && (
                    <button type="button" onClick={clearAllPhotos} className="report-photo-clear-all">
                      Xóa tất cả ảnh
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px'
                }}>
                  Vị trí *
                </label>
                
                {/* Ô tìm kiếm địa chỉ */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchAddress();
                        }
                      }}
                      placeholder="Nhập địa chỉ để tìm kiếm (VD: Đường 3 tháng 2, Quận 10)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#007bff'}
                      onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                    <button
                      type="button"
                      onClick={handleSearchAddress}
                      disabled={searchingAddress || !searchAddress.trim()}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'white',
                        background: searchingAddress || !searchAddress.trim() ? '#6c757d' : '#007bff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: searchingAddress || !searchAddress.trim() ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {searchingAddress ? 'Đang tìm...' : 'Tìm kiếm'}
                    </button>
                  </div>
                  
                  {/* Hiển thị kết quả tìm kiếm */}
                  {searchResults.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: 'white',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectSearchResult(result)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: index < searchResults.length - 1 ? '1px solid #e9ecef' : 'none',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div style={{
                            fontSize: '13px',
                            color: '#333',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>
                            {result.display_name.split(',').slice(0, 3).join(', ')}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#666'
                          }}>
                            Lat: {parseFloat(result.lat).toFixed(6)}, Lng: {parseFloat(result.lon).toFixed(6)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hiển thị vị trí đã chọn */}
                <div style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#666',
                  border: '1px solid #e9ecef'
                }}>
                  {formData.lat && formData.lng ? (
                    <>
                      <div style={{ color: '#28a745', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaCheck /> Đã chọn vị trí
                      </div>
                      {fetchingLocation ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#999' }}>
                          <FaClock style={{ fontSize: '12px' }} /> Đang lấy địa chỉ...
                        </div>
                      ) : locationDescription ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <MdLocationOn style={{ fontSize: '14px', marginTop: '2px', flexShrink: 0 }} />
                          <span>{locationDescription}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#999' }}>
                          <MdLocationOn style={{ fontSize: '14px' }} />
                          Lat: {formData.lat.toFixed(6)}, Lng: {formData.lng.toFixed(6)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MdAddLocation /> Click vào bản đồ hoặc tìm kiếm địa chỉ ở trên để chọn vị trí ngập
                    </div>
                  )}
                </div>
              </div>

              {/* Success Message */}
              {result && result.success && (
                <div style={{
                  padding: '15px',
                  marginBottom: '20px',
                  background: '#d4edda',
                  color: '#155724',
                  border: '1px solid #c3e6cb',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCheck /> Báo cáo thành công!
                  </strong>
                  <div style={{ marginTop: '8px' }}>
                    {result.message || 'Cảm ơn bạn đã đóng góp thông tin!'}
                  </div>
                  {(result.data?.verified_by_sensor || result.data?.sensor_verified) && (
                    <div style={{ marginTop: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaBullseye /> Báo cáo đã được xác minh bởi cảm biến gần đó
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '20px'
              }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading || result?.success}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#666',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: loading || result?.success ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !result?.success) {
                      e.target.style.background = '#e9ecef';
                      e.target.style.borderColor = '#bbb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && !result?.success) {
                      e.target.style.background = '#f5f5f5';
                      e.target.style.borderColor = '#ddd';
                    }
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || result?.success}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    background: loading || result?.success ? '#6c757d' : '#007bff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading || result?.success ? 'not-allowed' : 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  {loading ? 'Đang gửi...' : result?.success ? 'Đã gửi' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>

          {/* Map */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: '20px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaMap /> Chọn vị trí ngập
            </h3>
            <div style={{
              height: '500px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid #ddd',
              position: 'relative'
            }}>
              {/* Button xóa marker - góc trên bên phải */}
              {formData.lat && formData.lng && (
                <button
                  type="button"
                  onClick={handleRemoveMarker}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#dc3545',
                    border: '2px solid #dc3545',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    padding: 0,
                    margin: 0,
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#c82333';
                    e.currentTarget.style.borderColor = '#c82333';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#dc3545';
                    e.currentTarget.style.borderColor = '#dc3545';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="Xóa vị trí đã chọn"
                >
                  <FaTrash style={{ fontSize: '16px', display: 'block' }} />
                </button>
              )}
              {MAPBOX_TOKEN ? (
                <Map
                  ref={mapRef}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  initialViewState={{
                    longitude: mapCenter ? mapCenter[1] : defaultLng,
                    latitude: mapCenter ? mapCenter[0] : defaultLat,
                    zoom: mapCenter ? 16 : DEFAULT_ZOOM
                  }}
                  style={{ height: '100%', width: '100%' }}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  onClick={(e) => {
                    setHoveredSensorId(null);
                    handleLocationSelect(e.lngLat.lng, e.lngLat.lat);
                  }}
                >
                  {/* Marker cảm biến: đồng bộ với map trang chủ, click zoom to / hover hiện thông tin */}
                  {sensors.map((item, index) => {
                    const status = item.status || 'normal';
                    const color = statusColors[status] || statusColors.normal;
                    const sensorId = item.sensor_id || `sensor-${index}`;
                    const isOnline = status !== 'offline';
                    return (
                      <SensorMarker
                        key={sensorId}
                        item={item}
                        color={color}
                        isOnline={isOnline}
                        mode="report"
                        reportHoverId={sensorId}
                        hoveredSensorId={hoveredSensorId}
                        onHoverChange={setHoveredSensorId}
                        onZoomTo={() => {
                          const { lat, lng } = getSensorDisplayPosition(item);
                          const map = mapRef.current?.getMap?.() ?? mapRef.current;
                          if (map?.flyTo) map.flyTo({ center: [lng, lat], zoom: 16, duration: 800 });
                        }}
                      />
                    );
                  })}
                  {formData.lat && formData.lng && (
                    <>
                      <Marker longitude={formData.lng} latitude={formData.lat} anchor="center">
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#14b8a6',
                          border: '3px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          <WiFlood style={{ fontSize: '18px' }} />
                        </div>
                      </Marker>
                      <Popup longitude={formData.lng} latitude={formData.lat} anchor="bottom" closeButton closeOnClick={false}>
                        <div style={{ margin: 0, padding: 0, minWidth: '200px' }}>
                          <div style={{ padding: '8px 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
                            <div style={{ width: '20px', height: '20px', background: '#14b8a6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                              <WiFlood style={{ fontSize: '14px' }} />
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>Vị trí ngập lụt</span>
                          </div>
                          <div style={{ padding: 0 }}>
                            <div style={{ fontSize: '13px', color: '#333', marginBottom: '6px', fontWeight: '500' }}>{formData.name || 'Chưa có tên'}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                              <MdLocationOn style={{ fontSize: '14px', marginTop: '2px', flexShrink: 0 }} />
                              <span>{locationDescription || `Lat: ${formData.lat.toFixed(6)}, Lng: ${formData.lng.toFixed(6)}`}</span>
                            </div>
                            {formData.level && (
                              <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>Mức độ: {formData.level}</div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </>
                  )}
                </Map>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#666' }}>
                  Chưa cấu hình Mapbox token (VITE_MAPBOX_TOKEN trong .env)
                </div>
              )}
            </div>
            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <MdLightbulb /> Click vào bản đồ để đánh dấu vị trí ngập lụt
              </span>
              {sensors.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors.normal, border: '1px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} /> Chấm tròn = vị trí cảm biến (báo cáo gần cảm biến sẽ được xác minh)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewReportPage;
