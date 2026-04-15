import React, { useEffect, useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { fetchCrowdReports, fetchAllCrowdReports, fetchAllReportsAdmin } from '../services/api';
import { POLLING_INTERVALS, CROWD_REPORT_MAP_DISPLAY_HOURS } from '../config/apiConfig';
import { isReportExpired } from '../utils/reportHelpers';
import { useNavigate } from 'react-router-dom';
import { isModerator, isAdmin, getCurrentUser } from '../utils/auth';
import { useReporterRanking } from '../context/ReporterRankingProvider';
import { 
  FaMobileScreen, 
  FaCheck, 
  FaXmark, 
  FaClock, 
  FaCircleQuestion,
  FaStar,
  FaCircle,
  FaTriangleExclamation,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaClock as FaClockIcon
} from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import ConfidenceBadge from '../components/common/ConfidenceBadge';
const ReportsPage = () => {
  const navigate = useNavigate();
  const { getReporterReliability } = useReporterRanking();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, verified, pending
  const [expiryFilter, setExpiryFilter] = useState('active'); // all, active, expired
  const [searchText, setSearchText] = useState('');
  const [confidenceBand, setConfidenceBand] = useState('all');
  const [confidenceSort, setConfidenceSort] = useState('none');
  
  // Filter options for Combobox
  const filterOptions = [
    { id: 'all', name: 'Trạng thái: Tất cả' },
    { id: 'verified', name: 'Trạng thái: Đã xác minh' },
    { id: 'pending', name: 'Trạng thái: Chờ xem xét' },
  ];

  const expiryFilterOptions = [
    { id: 'all', name: 'Thời hạn: Tất cả' },
    { id: 'active', name: 'Thời hạn: Còn hiệu lực' },
    { id: 'expired', name: 'Thời hạn: Đã hết hạn' },
  ];
  
  const selectedFilter = filterOptions.find(opt => opt.id === filter) || filterOptions[0];
  const selectedExpiryFilter = expiryFilterOptions.find(opt => opt.id === expiryFilter) || expiryFilterOptions[1];
  const [filterQuery, setFilterQuery] = useState('');
  const [expiryFilterQuery, setExpiryFilterQuery] = useState('');
  
  const filteredOptions =
    filterQuery === ''
      ? filterOptions
      : filterOptions.filter((option) =>
          option.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(filterQuery.toLowerCase().replace(/\s+/g, ''))
        );

  const filteredExpiryOptions =
    expiryFilterQuery === ''
      ? expiryFilterOptions
      : expiryFilterOptions.filter((option) =>
          option.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(expiryFilterQuery.toLowerCase().replace(/\s+/g, ''))
        );
  
  const [locationCache, setLocationCache] = useState(() => {
    // Load cache từ localStorage khi khởi tạo
    try {
      const saved = localStorage.getItem('locationCache');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [hoveredCardId, setHoveredCardId] = useState(null); // Track card đang được hover
  const [fetchingLocations, setFetchingLocations] = useState(new Set()); // Track các location đang được fetch

  // Hàm format địa chỉ từ reverse geocoding
  const formatAddress = (data) => {
    if (!data || !data.address) return null;
    
    const addr = data.address;
    const parts = [];
    
    // Ưu tiên: tên đường > tên địa điểm > quận/huyện > thành phố
    if (addr.road) {
      parts.push(addr.road);
    }
    if (addr.house_number) {
      parts.unshift(addr.house_number); // Số nhà đặt trước tên đường
    }
    if (addr.suburb || addr.neighbourhood) {
      parts.push(addr.suburb || addr.neighbourhood);
    }
    if (addr.ward) {
      parts.push(`Phường ${addr.ward}`);
    }
    if (addr.district || addr.city_district) {
      parts.push(`Quận ${addr.district || addr.city_district}`);
    }
    if (addr.city && !addr.district) {
      parts.push(addr.city);
    }
    
    // Nếu có đủ thông tin, trả về địa chỉ đã format
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    // Fallback: dùng display_name nhưng format lại
    if (data.display_name) {
      const displayName = data.display_name
        .split(',')
        .slice(0, 4) // Lấy 4 phần đầu (thường là địa chỉ cụ thể)
        .join(', ')
        .trim();
      return displayName;
    }
    
    return null;
  };

  // Hàm lấy địa chỉ từ tọa độ với cache và debounce
  const fetchLocationDescription = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    // Kiểm tra cache trước (cả trong state và localStorage)
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }
    
    // Kiểm tra xem đang fetch location này chưa (tránh duplicate requests)
    if (fetchingLocations.has(cacheKey)) {
      return null; // Đang fetch rồi, không fetch lại
    }
    
    // Đánh dấu đang fetch
    setFetchingLocations(prev => new Set(prev).add(cacheKey));
    
    try {
      // Thêm delay nhỏ để tránh rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`,
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
      const formattedAddress = formatAddress(data);
      
      if (formattedAddress) {
        // Lưu vào cache (cả state và localStorage)
        const newCache = { ...locationCache, [cacheKey]: formattedAddress };
        setLocationCache(newCache);
        
        // Lưu vào localStorage để persist
        try {
          localStorage.setItem('locationCache', JSON.stringify(newCache));
        } catch {
          // Quota or private mode — state cache still holds the address
        }
        
        return formattedAddress;
      }
      
      return null;
    } catch {
      return null;
    } finally {
      // Xóa khỏi set đang fetch
      setFetchingLocations(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        // Lấy user hiện tại
        const currentUser = getCurrentUser();
        const isStaff = isModerator() || isAdmin();

        let result;
        // User thường: /api/crowd-reports/all — lọc theo reporter_id
        // Admin/Moderator: /api/reports/all — đủ field (confidence, …)
        // Khách: /api/crowd-reports (24h, public)
        if (currentUser && !isStaff) {
          result = await fetchAllCrowdReports({ limit: 1000 });
        } else if (isStaff) {
          result = await fetchAllReportsAdmin({ limit: 1000 });
        } else {
          result = await fetchCrowdReports();
        }

        if (result.success && result.data) {
          // Filter reports dựa trên role
          let filteredReports = result.data;
          if (!isStaff && currentUser) {
            // User thường: chỉ hiển thị báo cáo của chính họ (kể cả đang chờ xem xét)
            filteredReports = result.data.filter(report => {
              // Chỉ filter dựa trên reporter_id (không dùng fallback)
              const reportReporterId = report.reporter_id;
              const userId = currentUser.id;
              
              // Chỉ match khi có reporter_id và khớp với user.id
              if (!reportReporterId) {
                return false; // Không có reporter_id thì không match
              }
              
              return String(reportReporterId) === String(userId) || 
                     Number(reportReporterId) === Number(userId);
            });
          }
          // Admin/Moderator: hiển thị tất cả (không filter)
          
          setReports(filteredReports);
          
          // Lấy địa chỉ cho các báo cáo không có location_description (tối ưu với cache)
          // Chỉ fetch cho các report chưa có trong cache
          const reportsWithoutLocation = filteredReports.filter(
            report => {
              if (!report.lat || !report.lng) return false;
              if (report.location_description) return false; // Đã có địa chỉ rồi
              
              // Kiểm tra cache
              const cacheKey = `${report.lat.toFixed(6)},${report.lng.toFixed(6)}`;
              const currentCache = JSON.parse(localStorage.getItem('locationCache') || '{}');
              if (currentCache[cacheKey]) {
                // Có trong cache, cập nhật ngay
                setReports(prevReports => 
                  prevReports.map(r => 
                    r.id === report.id ? { ...r, location_description: currentCache[cacheKey] } : r
                  )
                );
                return false; // Không cần fetch
              }
              
              return true; // Cần fetch
            }
          );
          
          // Giới hạn 2 báo cáo mỗi lần để tránh rate limit
          const reportsToFetch = reportsWithoutLocation.slice(0, 2);
          
          // Fetch tuần tự (không parallel) để tránh rate limiting
          for (const report of reportsToFetch) {
            const address = await fetchLocationDescription(report.lat, report.lng);
            if (address) {
              // Cập nhật report với địa chỉ mới
              setReports(prevReports => 
                prevReports.map(r => 
                  r.id === report.id ? { ...r, location_description: address } : r
                )
              );
            }
            // Delay giữa các request để tránh rate limiting (Nominatim yêu cầu 1 request/giây)
            if (reportsToFetch.indexOf(report) < reportsToFetch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1100));
            }
          }
        } else {
          setReports([]);
        }
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
    const interval = setInterval(loadReports, POLLING_INTERVALS.CROWD_REPORTS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount, không phụ thuộc vào cache để tránh infinite loop

  // Hàm lấy status info - ưu tiên moderation_status theo logic đúng
  const getStatusInfo = (report) => {
    // Logic: Nếu moderation_status đã được xử lý (approved/rejected), hiển thị nó
    // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
    const moderationStatus = report.moderation_status;
    const validationStatus = report.validation_status;
    
    // Nếu đã được moderator xử lý (approved hoặc rejected), ưu tiên hiển thị
    if (moderationStatus === 'approved' || moderationStatus === 'rejected') {
      if (moderationStatus === 'rejected') {
        return { text: 'Đã từ chối', color: '#dc3545', icon: FaXmark };
      }
      // Đã duyệt: màu theo mức độ ngập (Nặng / Trung bình / Nhẹ)
      const levelColors = {
        'Nặng': '#dc3545',
        'Trung bình': '#ffc107',
        'Nhẹ': '#17a2b8'
      };
      const level = report.flood_level && levelColors[report.flood_level] ? report.flood_level : null;
      const color = level ? levelColors[level] : '#28a745';
      return { text: 'Đã duyệt', color, icon: FaCheck };
    }
    
    // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
    const displayStatus = moderationStatus === 'pending' || !moderationStatus 
      ? validationStatus 
      : moderationStatus;
    
    // Badge mapping cho validation_status
    const statusConfig = {
      pending: { text: 'Chờ xét duyệt', color: '#ffc107', icon: FaClock },
      verified: { text: 'Đã xác minh', color: '#17a2b8', icon: FaCheck },
      cross_verified: { text: 'Đã xác minh chéo', color: '#28a745', icon: FaCheck }
    };
    
    // Nếu có verified_by_sensor, ưu tiên hiển thị cross_verified
    if (report.verified_by_sensor) {
      return statusConfig.cross_verified;
    }
    
    return statusConfig[displayStatus] || { text: 'Không xác định', color: '#6c757d', icon: FaCircleQuestion };
  };

  const getReliabilityBadge = (score) => {
    if (score >= 81) return { color: '#28a745', text: 'Rất cao', icon: FaStar };
    if (score >= 61) return { color: '#17a2b8', text: 'Cao', icon: FaCircle };
    if (score >= 31) return { color: '#ffc107', text: 'Trung bình', icon: FaCircle };
    return { color: '#dc3545', text: 'Thấp', icon: FaCircle };
  };

  const getFloodLevelInfo = (level) => {
    const levels = {
      'Nhẹ': { 
        color: '#17a2b8', 
        icon: WiFlood, 
        desc: 'Đến mắt cá (~10cm)',
        gradient: 'linear-gradient(180deg, #4FC3F7 0%, #29B6F6 100%)', // Light blue gradient
        gradientDark: 'linear-gradient(180deg, #29B6F6 0%, #0288D1 100%)'
      },
      'Trung bình': { 
        color: '#ffc107', 
        icon: WiFlood, 
        desc: 'Đến đầu gối (~30cm)',
        gradient: 'linear-gradient(180deg, #FFB74D 0%, #FF9800 100%)', // Orange gradient
        gradientDark: 'linear-gradient(180deg, #FF9800 0%, #F57C00 100%)'
      },
      'Nặng': { 
        color: '#dc3545', 
        icon: WiFlood, 
        desc: 'Ngập nửa xe (~50cm)',
        gradient: 'linear-gradient(180deg, #EF5350 0%, #E53935 100%)', // Red gradient
        gradientDark: 'linear-gradient(180deg, #E53935 0%, #C62828 100%)'
      }
    };
    return levels[level] || { 
      color: '#6c757d', 
      icon: FaCircleQuestion, 
      desc: level,
      gradient: 'linear-gradient(180deg, #9E9E9E 0%, #757575 100%)',
      gradientDark: 'linear-gradient(180deg, #757575 0%, #616161 100%)'
    };
  };

  const filteredReports = reports.filter(report => {
    // Filter by expiry (thời hạn)
    const expired = isReportExpired(report, CROWD_REPORT_MAP_DISPLAY_HOURS);
    if (expiryFilter === 'active' && expired) return false;
    if (expiryFilter === 'expired' && !expired) return false;

    // Filter by status
    let matchesFilter = true;
    if (filter === 'verified') {
      matchesFilter = report.moderation_status === 'approved';
    } else if (filter === 'pending') {
      matchesFilter = report.moderation_status === 'pending' || !report.moderation_status;
    }
    
    if (confidenceBand !== 'all') {
      const n = report.confidence != null ? Number(report.confidence) : null;
      if (n == null || Number.isNaN(n)) return false;
      if (confidenceBand === 'low' && n >= 40) return false;
      if (confidenceBand === 'mid' && (n < 40 || n >= 70)) return false;
      if (confidenceBand === 'high' && n < 70) return false;
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = 
        (report.id && report.id.toString().toLowerCase().includes(searchLower)) ||
        (report.reporter_name && report.reporter_name.toLowerCase().includes(searchLower)) ||
        (report.flood_level && report.flood_level.toLowerCase().includes(searchLower)) ||
        (report.description && report.description.toLowerCase().includes(searchLower));
      
      return matchesFilter && matchesSearch;
    }
    
    return matchesFilter;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (confidenceSort === 'none') return 0;
    const ca = a.confidence != null ? Number(a.confidence) : -1;
    const cb = b.confidence != null ? Number(b.confidence) : -1;
    if (confidenceSort === 'desc') return cb - ca;
    if (confidenceSort === 'asc') return ca - cb;
    return 0;
  });

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 60px)', // Subtract header height
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      padding: '20px'
    }}>
      {/* Page Title */}
      <div style={{
        backgroundImage: 'url(/report.png)',
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
          Báo cáo từ người dân
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
          Tổng hợp và quản lý các báo cáo ngập lụt từ cộng đồng người dân
        </p>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* Filters - Jira Style */}
          <div style={{ 
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #dfe1e6',
            marginBottom: '20px',
            position: 'relative',
            zIndex: 10
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <div className="relative" style={{ minWidth: '200px', zIndex: 50 }}>
                <Combobox value={selectedFilter} onChange={(option) => setFilter(option.id)}>
                  <div className="relative mt-1">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border border-gray-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 text-xs">
                      <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 text-xs leading-4 text-gray-900 focus:ring-0 focus:outline-none cursor-pointer"
                        displayValue={(option) => option.name}
                        onChange={(event) => setFilterQuery(event.target.value)}
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
                      afterLeave={() => setFilterQuery('')}
                    >
                      <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black/5 focus:outline-none">
                        {filteredOptions.length === 0 && filterQuery !== '' ? (
                          <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                            Không tìm thấy.
                          </div>
                        ) : (
                          filteredOptions.map((option) => (
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

              <div className="relative" style={{ minWidth: '200px', zIndex: 49 }}>
                <Combobox value={selectedExpiryFilter} onChange={(option) => setExpiryFilter(option.id)}>
                  <div className="relative mt-1">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border border-gray-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 text-xs">
                      <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 text-xs leading-4 text-gray-900 focus:ring-0 focus:outline-none cursor-pointer"
                        displayValue={(option) => option.name}
                        onChange={(event) => setExpiryFilterQuery(event.target.value)}
                        onClick={(e) => e.target.select()}
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
                      afterLeave={() => setExpiryFilterQuery('')}
                    >
                      <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black/5 focus:outline-none">
                        {filteredExpiryOptions.length === 0 && expiryFilterQuery !== '' ? (
                          <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                            Không tìm thấy.
                          </div>
                        ) : (
                          filteredExpiryOptions.map((option) => (
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
              
              <div style={{
                flex: 1,
                minWidth: '200px',
                position: 'relative'
              }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm báo cáo..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // Search is handled automatically by filteredReports
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    border: '1px solid #dfe1e6',
                    fontSize: '14px',
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#172b4d'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = '#dfe1e6'}
                />
              </div>

              <button
                style={{
                  padding: '6px 12px',
                  border: '1px solid #dfe1e6',
                  background: '#1976d2',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#1565c0'}
                onMouseLeave={(e) => e.target.style.background = '#1976d2'}
              >
                <FaMagnifyingGlass style={{ fontSize: '14px' }} />
                Tìm kiếm
              </button>

              <select
                value={confidenceBand}
                onChange={(e) => setConfidenceBand(e.target.value)}
                aria-label="Lọc theo độ tin báo cáo"
                style={{
                  padding: '6px 10px',
                  border: '1px solid #dfe1e6',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#172b4d',
                  background: 'white',
                  maxWidth: '180px'
                }}
              >
                <option value="all">Độ tin: tất cả</option>
                <option value="low">Độ tin: dưới 40</option>
                <option value="mid">Độ tin: 40–69</option>
                <option value="high">Độ tin: từ 70</option>
              </select>
              <select
                value={confidenceSort}
                onChange={(e) => setConfidenceSort(e.target.value)}
                aria-label="Sắp xếp theo độ tin"
                style={{
                  padding: '6px 10px',
                  border: '1px solid #dfe1e6',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#172b4d',
                  background: 'white',
                  maxWidth: '200px'
                }}
              >
                <option value="none">Sắp xếp tin cậy: không</option>
                <option value="desc">Tin cậy: cao xuống thấp</option>
                <option value="asc">Tin cậy: thấp lên cao</option>
              </select>
            </div>
          </div>

          {/* Reports List */}
          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <p style={{ color: '#666', fontSize: '16px' }}>Đang tải báo cáo...</p>
            </div>
          ) : sortedReports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              color: '#6c757d'
            }}>
              <p style={{ fontSize: '18px', margin: '0 0 10px 0', fontWeight: '500' }}>Không có báo cáo nào</p>
              <button
                onClick={() => navigate('/report/new')}
                style={{
                  marginTop: '15px',
                  padding: '12px 24px',
                  background: '#1E3A8A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <FaPenToSquare /> Tạo báo cáo mới
              </button>
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '15px'
            }}>
            {sortedReports.map((report, index) => {
              const statusInfo = getStatusInfo(report);
              const rel = getReporterReliability(report.reporter_id) ?? report.reporter_reliability ?? null;
              const reliabilityInfo = getReliabilityBadge(rel ?? 50);
              const levelInfo = getFloodLevelInfo(report.flood_level);
              const cardId = report.id || `report-${index}`;
              const isHovered = hoveredCardId === cardId;

              return (
                <div
                  key={cardId}
                  className="report-card-gradient"
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    transition: 'border-color 0.2s ease',
                    cursor: 'pointer',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = levelInfo.color;
                    setHoveredCardId(cardId);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    setHoveredCardId(null);
                  }}
                >
                  {/* Top Section - White with Icon and Title */}
                  <div style={{
                    padding: '24px 20px',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: levelInfo.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      color: 'white'
                    }}>
                      <levelInfo.icon />
                    </div>
                    
                    {/* Title */}
                    <div style={{
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#2c3e50',
                        marginBottom: '4px'
                      }}>
                        {report.flood_level}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        fontWeight: '500'
                      }}>
                        {levelInfo.desc}
                      </div>
                      {report.confidence != null && (
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                          <ConfidenceBadge confidence={report.confidence} breakdown={report.confidence_breakdown} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wave Separator - Transparent */}
                  <div style={{
                    height: '24px',
                    background: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    marginTop: '-1px'
                  }}>
                    <svg 
                      viewBox="0 0 1200 24" 
                      preserveAspectRatio="none"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                      }}
                    >
                      <path
                        d="M0,24 C200,8 400,16 600,12 C800,8 1000,16 1200,12 L1200,24 L0,24 Z"
                        fill="transparent"
                        style={{
                          transition: 'fill 0.2s ease'
                        }}
                      />
                    </svg>
                  </div>

                  {/* Bottom Section - With GIF Background */}
                  <div style={{
                    flex: 1,
                    padding: '20px',
                    color: '#2c3e50',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* GIF Background - Only plays on hover */}
                    {isHovered ? (
                      <img 
                        src="/water_flow.gif" 
                        alt="Water flow"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          pointerEvents: 'none'
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        pointerEvents: 'none'
                      }}></div>
                    )}
                    
                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {/* Reporter Name and Status */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          marginBottom: '4px'
                        }}>
                          {report.reporter_name || 'Ẩn danh'}
                        </div>
                        {rel != null && (
                          <div style={{
                            fontSize: '11px',
                            background: 'rgba(0,0,0,0.1)',
                            color: '#2c3e50',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            display: 'inline-block'
                          }}>
                            Độ tin cậy: {reliabilityInfo.text} ({typeof rel === 'number' ? rel.toFixed(1) : rel})
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '11px',
                        background: report.moderation_status === 'approved' || report.moderation_status === 'rejected'
                          ? statusInfo.color
                          : 'rgba(0,0,0,0.1)',
                        color: report.moderation_status === 'approved' || report.moderation_status === 'rejected'
                          ? '#fff'
                          : '#2c3e50',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <statusInfo.icon /> {statusInfo.text}
                      </span>
                    </div>

                    {/* Location */}
                    <div style={{
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'start',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.7)',
                      padding: '10px',
                      borderRadius: '8px',
                      backdropFilter: 'blur(10px)',
                      color: '#2c3e50'
                    }}>
                      <MdLocationOn style={{ marginTop: '2px', flexShrink: 0, fontSize: '16px' }} />
                      <span style={{ flex: 1, lineHeight: '1.5' }}>
                        {report.location_description || 
                         (report.lat && report.lng ? `${report.lat.toFixed(6)}, ${report.lng.toFixed(6)}` : 'Không có thông tin vị trí')}
                      </span>
                    </div>

                    {/* Description */}
                    {report.description && (
                      <div style={{
                        fontSize: '12px',
                        background: 'rgba(255,255,255,0.7)',
                        padding: '12px',
                        borderRadius: '8px',
                        lineHeight: '1.6',
                        backdropFilter: 'blur(10px)',
                        fontStyle: 'italic',
                        color: '#2c3e50'
                      }}>
                        "{report.description}"
                      </div>
                    )}

                    {/* Footer Info */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      color: '#2c3e50'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaClockIcon /> {new Date(report.created_at).toLocaleString('vi-VN')}
                      </div>
                      {report.verified_by_sensor && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          background: 'rgba(255,255,255,0.7)',
                          padding: '6px 10px',
                            borderRadius: '8px',
                          fontWeight: '500',
                          color: '#2c3e50'
                        }}>
                          <FaCheck /> Đã được xác nhận bởi cảm biến
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

    </div>
  );
};

export default ReportsPage;
