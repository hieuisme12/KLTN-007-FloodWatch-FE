import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import FilterDropdown from '../../components/common/FilterDropdown';
import 'mapbox-gl/dist/mapbox-gl.css';
import { submitFloodReport, uploadReportImage, fetchFloodData } from '../../services/api';
import { isAuthenticated, getCurrentUser } from '../../utils/auth';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import { getSensorDisplayPosition } from '../../data/sensorOverrides';
import ReportLocationMapPopup from '../../components/reports/ReportLocationMapPopup';
import { 
  FaCheck,
  FaXmark,
  FaClock,
  FaMap,
  FaImage,
  FaBullseye
} from 'react-icons/fa6';
import { MdAddLocation, MdLocationOn } from 'react-icons/md';
import ErrorToast from '../../components/common/ErrorToast';
import { CancelButton, ConfirmButton, PrimaryButton } from '../../components/common/Button';
import SearchAutoComplete from '../../components/common/SearchAutoComplete';
import { searchAddressSuggestionsInHcm, fetchAddressFromCoords, resolveGeocodePlaceSelection, clearGeocodeAutocompleteSessionToken } from '../../utils/geocode';
import {
  getFloodLevelDropdownOptions,
  isValidFloodLevel
} from '../../utils/floodLevels';
import {
  buildReportSubmitSuccessCopy,
  getReportValidationSubline,
  pickDisplayLabel
} from '../../utils/reportDisplayStatus';
import { useTranslation } from 'react-i18next';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
// Mapbox: [lng, lat]; DEFAULT_CENTER là [lat, lng]
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

export function NewReportForm({ onCancel, onSuccess }) {
  const { t } = useTranslation();
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
  
  const floodLevelOptions = useMemo(
    () => getFloodLevelDropdownOptions(t),
    [t]
  );
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Khách phải nhập tên; user đăng nhập không gửi name (BE lấy từ tài khoản)
    if (!authenticated && (!formData.name || formData.name.trim().length < 2)) {
      setError(t('newReport.errName'));
      return;
    }

    if (!isValidFloodLevel(formData.level)) {
      setError(t('newReport.errLevel'));
      return;
    }

    if (!formData.lng || !formData.lat) {
      setError(t('newReport.errMap'));
      return;
    }

    setLoading(true);
    try {
      const photoUrls = [];
      for (const item of photoList) {
        const uploadResult = await uploadReportImage(item.file);
        if (!uploadResult.success) {
          setError(uploadResult.error || t('newReport.errUpload'));
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
        setTimeout(() => onSuccess?.(), 2000);
      } else {
        setError(response.error || t('newReport.errGeneric'));
      }
    } catch (err) {
      setError(err?.message || t('newReport.errNetwork'));
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
    if (valid.length < files.length) setError(t('newReport.errNonImages'));
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

  // Hàm lấy địa chỉ từ tọa độ với cache (BE Google → Mapbox → Nominatim; không mã bưu chính khi hiển thị)
  const fetchLocationDescription = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

    if (locationCache[cacheKey]) {
      setLocationDescription(locationCache[cacheKey]);
      return locationCache[cacheKey];
    }

    setFetchingLocation(true);

    try {
      const formattedAddress = await fetchAddressFromCoords(lat, lng);

      if (formattedAddress) {
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

  const openMapPopup = () => {
    mapSnapshotRef.current = {
      lat: formData.lat,
      lng: formData.lng,
      locationDescription
    };
    setMapOpen(true);
  };

  const handleMapCancel = () => {
    const snap = mapSnapshotRef.current;
    if (snap) {
      setFormData((prev) => ({ ...prev, lat: snap.lat, lng: snap.lng }));
      setLocationDescription(snap.locationDescription ?? null);
      if (snap.lat != null && snap.lng != null) {
        setMapCenter([snap.lat, snap.lng]);
      } else {
        setMapCenter(null);
      }
    }
    setMapOpen(false);
  };

  const handleMapConfirm = () => {
    setMapOpen(false);
  };

  /** Gợi ý địa chỉ: BE → Mapbox → Nominatim (nhạy hơn khi có số nhà nếu có token / BE). */
  const completeAddressSearch = async (e) => {
    const q = e.query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      if (!q) clearGeocodeAutocompleteSessionToken();
      return;
    }
    setSearchingAddress(true);
    setError(null);
    try {
      const data = await searchAddressSuggestionsInHcm(q, {
        limit: 8,
        lat: defaultLat,
        lng: defaultLng,
        radius: 35000
      });
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Hàm chọn kết quả tìm kiếm
  const handleSelectSearchResult = async (result) => {
    if (!result) return;
    let lat = parseFloat(result.lat);
    let lng = parseFloat(result.lon);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasCoords && result.place_id) {
      setSearchingAddress(true);
      try {
        const resolved = await resolveGeocodePlaceSelection({
          place_id: result.place_id,
          geocode_session_token: result.geocode_session_token,
          display_name: result.display_name
        });
        if (!resolved) {
          setError(t('newReport.errGeocodePick'));
          return;
        }
        lat = resolved.lat;
        lng = resolved.lng;
      } finally {
        setSearchingAddress(false);
      }
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError(t('newReport.errGeocodeSuggest'));
      return;
    }
    setFormData({ ...formData, lat, lng });
    setSearchAddress('');
    setSearchResults([]);
    clearGeocodeAutocompleteSessionToken();
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
  const [mapOpen, setMapOpen] = useState(false);
  const mapSnapshotRef = useRef(null);

  // Zoom map đúng vùng gần các sensor: fetch flood data, lưu danh sách sensor + tính bounds để fit
  useEffect(() => {
    let cancelled = false;
    fetchFloodData(endpointRef).then((res) => {
      if (cancelled || !res.success || !res.data?.length) return;
      const list = res.data.filter((s) => s.lat != null && s.lng != null);
      if (list.length === 0) return;
      setSensors(list);
      const points = list.map((s) => getSensorDisplayPosition(s)).filter(Boolean);
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
    return () => {
      cancelled = true;
    };
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
    onCancel?.();
  };

  const reporterDisplayName = authenticated
    ? currentUser?.full_name || currentUser?.username
    : formData.name;

  return (
    <>
      {error && (
        <ErrorToast message={error} onClose={() => setError(null)} />
      )}
      <form className="create-report-form-list" onSubmit={handleSubmit}>
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
                  {t('newReport.displayNameHint')} <strong>{currentUser?.full_name || currentUser?.username || t('reportUi.you')}</strong>
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
                    {t('newReport.reporterNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('newReport.namePh')}
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
                  {t('newReport.levelLabel')}
                </label>
                <FilterDropdown
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.value })}
                  options={floodLevelOptions}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={t('newReport.levelPh')}
                  className="filter-dropdown-toolbar w-full"
                />
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
                  {t('newReport.contentLabel')}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('newReport.contentPh')}
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
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{t('newReport.charCount', { n: content.length })}</div>
              </div>

              {/* Hình ảnh hiện trường (optional, tối đa 5 ảnh) */}
              <div className="create-report-field" style={{ marginBottom: '16px' }}>
                <div className="create-report-field__label-row">
                  <label className="create-report-label">{t('newReport.photosLabel', { max: MAX_PHOTOS })}</label>
                  {photoList.length > 0 && (
                    <button type="button" onClick={clearAllPhotos} className="report-photo-clear-all">
                      {t('newReport.clearAllPhotos')}
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                  id="report-photo-input"
                />
                <div className="report-photos-section">
                  <div className="report-photos-row">
                  {photoList.length < MAX_PHOTOS && (
                    <label
                      htmlFor="report-photo-input"
                      className="report-photo-add-btn"
                    >
                      <FaImage style={{ fontSize: '20px', marginBottom: '4px' }} />
                      <span>{t('newReport.selectPhotoBtn')}</span>
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
                            title={t('newReport.removePhoto')}
                            aria-label={t('newReport.removePhoto')}
                          >
                            <FaXmark className="report-photo-remove__icon" aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </div>

              <div className="create-report-field create-report-field--location">
                <div className="create-report-field__label-row">
                  <label className="create-report-label">{t('newReport.locationSectionLabel')}</label>
                  <PrimaryButton type="button" size="sm" className="gap-1.5 shrink-0" onClick={openMapPopup}>
                    <FaMap /> {t('newReport.openMapBtn')}
                  </PrimaryButton>
                </div>
                <div className="create-report-control">
                  <SearchAutoComplete
                    value={searchAddress}
                    suggestions={searchResults}
                    completeMethod={completeAddressSearch}
                    field="display_name"
                    minLength={2}
                    delay={400}
                    placeholder={t('newReport.addressSearchPh')}
                    className="w-full text-sm"
                    inputClassName="rounded border border-gray-300 px-2 py-2 text-sm"
                    onChange={(ev) => {
                      const v = ev.value;
                      const s = typeof v === 'string' ? v : '';
                      setSearchAddress(s);
                      if (!s.trim()) clearGeocodeAutocompleteSessionToken();
                    }}
                    onSelect={(ev) => handleSelectSearchResult(ev.value)}
                  />
                  {searchingAddress && (
                    <p className="create-report-field-note">{t('newReport.searchingSuggest')}</p>
                  )}
                </div>
                <div className="create-report-location-preview">
                  {formData.lat && formData.lng ? (
                    <>
                      <div className="create-report-location-preview__ok">
                        <FaCheck /> {t('newReport.locationSelected')}
                      </div>
                      {fetchingLocation ? (
                        <p className="create-report-location-preview__pending">
                          <FaClock /> {t('newReport.resolvingAddr')}
                        </p>
                      ) : locationDescription ? (
                        <p className="create-report-location-preview__addr">
                          <MdLocationOn />
                          <span>{locationDescription}</span>
                        </p>
                      ) : (
                        <p className="create-report-location-preview__addr">
                          <MdLocationOn />
                          <span>
                            {t('newReport.latLngRaw', {
                              lat: formData.lat.toFixed(6),
                              lng: formData.lng.toFixed(6)
                            })}
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="create-report-location-preview__empty">
                      <MdAddLocation /> {t('newReport.pickLocationHint')}
                    </p>
                  )}
                </div>
              </div>

{/* Success Message */}
              {result && result.success && (
                <div style={{
                  padding: '15px',
                  marginBottom: '20px',
                  background: '#fffbf0',
                  color: '#78350f',
                  border: '1px solid #fde68a',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock /> {t('newReport.successTitle')}
                  </strong>
                  <div style={{ marginTop: '8px' }}>
                    {buildReportSubmitSuccessCopy(result, t)}
                  </div>
                  {(pickDisplayLabel(result.data?.display_validation, t) ||
                    getReportValidationSubline(result.data, t)) && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#92400e' }}>
                      {pickDisplayLabel(result.data?.display_validation, t) ||
                        getReportValidationSubline(result.data, t)}
                    </div>
                  )}
                </div>
              )}

              <div className="create-report-form-actions">
                <CancelButton
                  type="button"
                  onClick={handleCancel}
                  disabled={loading || result?.success}
                >
                  {t('newReport.cancelBtn')}
                </CancelButton>
                <ConfirmButton
                  type="submit"
                  disabled={loading || result?.success}
                  loading={loading}
                >
                  {loading ? t('newReport.sending') : result?.success ? t('newReport.sent') : t('newReport.submit')}
                </ConfirmButton>
              </div>
      </form>

      <ReportLocationMapPopup
        open={mapOpen}
        onClose={handleMapConfirm}
        onCancel={handleMapCancel}
        onConfirm={handleMapConfirm}
        mapRef={mapRef}
        defaultLng={defaultLng}
        defaultLat={defaultLat}
        defaultZoom={DEFAULT_ZOOM}
        mapCenter={mapCenter}
        formData={formData}
        locationDescription={locationDescription}
        sensors={sensors}
        hoveredSensorId={hoveredSensorId}
        setHoveredSensorId={setHoveredSensorId}
        onMapClick={handleLocationSelect}
        onRemoveMarker={handleRemoveMarker}
        reporterDisplayName={reporterDisplayName}
        reporterAvatarFileName={authenticated ? currentUser?.avatar : null}
        searchAddress={searchAddress}
        searchResults={searchResults}
        searchingAddress={searchingAddress}
        onSearchAddressChange={(v) => {
          setSearchAddress(v);
          if (!v.trim()) clearGeocodeAutocompleteSessionToken();
        }}
        onCompleteAddressSearch={completeAddressSearch}
        onSelectSearchResult={handleSelectSearchResult}
      />
    </>
  );
}

function NewReportPage() {
  return <Navigate to="/reports?create=1" replace />;
}

export default NewReportPage;
