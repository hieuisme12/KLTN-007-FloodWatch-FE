import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import FilterDropdown from "../../components/common/FilterDropdown";
import { fetchCrowdReports, fetchAllCrowdReports } from "../../services/api";
import {
  POLLING_INTERVALS,
  CROWD_REPORT_MAP_DISPLAY_HOURS,
} from "../../config/apiConfig";
import { isReportExpired } from "../../utils/reportHelpers";
import { useSearchParams } from "react-router-dom";
import { getCurrentUser } from "../../utils/auth";
import CreateReportModal from "../../components/reports/CreateReportModal";
import { PrimaryButton } from "../../components/common/Button";
import { isGuestBrowseMode } from "../../utils/guestSession";
import { useGuestExplore } from "../../hooks/useGuestExplore";
import { useReporterRanking } from "../../context/ReporterRankingProvider";
import {
  FaCheck,
  FaXmark,
  FaClock,
  FaCircleQuestion,
  FaStar,
  FaCircle,
} from "react-icons/fa6";
import { WiFlood } from "react-icons/wi";
import { MdLocationOn } from "react-icons/md";
import ConfidenceBadge from "../../components/common/ConfidenceBadge";
import SearchAutoComplete from "../../components/common/SearchAutoComplete";
import Skeleton from "react-loading-skeleton";
import {
  fetchAddressFromCoords,
  formatAddressForUiDisplay,
} from "../../utils/geocode";
const ReportsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openRequireLogin } = useGuestExplore();
  const reloadReportsRef = useRef(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const { getReporterReliability } = useReporterRanking();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, verified, pending
  const [expiryFilter, setExpiryFilter] = useState("active"); // all, active, expired
  const [searchText, setSearchText] = useState("");
  const [reportSuggestions, setReportSuggestions] = useState([]);
  const [confidenceBand, setConfidenceBand] = useState("all");
  const [confidenceSort, setConfidenceSort] = useState("none");

  const filterOptions = useMemo(
    () => [
      { id: "all", name: t("reportsPage.modAll") },
      { id: "verified", name: t("reportsPage.modVerified") },
      { id: "pending", name: t("reportsPage.modPending") },
    ],
    [t],
  );

  const expiryFilterOptions = useMemo(
    () => [
      { id: "all", name: t("reportsPage.expAll") },
      { id: "active", name: t("reportsPage.expActive") },
      { id: "expired", name: t("reportsPage.expExpired") },
    ],
    [t],
  );

  const confidenceBandOptions = useMemo(
    () => [
      { id: "all", name: t("reportsPage.confAll") },
      { id: "low", name: t("reportsPage.confLow") },
      { id: "mid", name: t("reportsPage.confMid") },
      { id: "high", name: t("reportsPage.confHigh") },
    ],
    [t],
  );
  const confidenceSortOptions = useMemo(
    () => [
      { id: "none", name: t("reportsPage.sortNone") },
      { id: "desc", name: t("reportsPage.sortDesc") },
      { id: "asc", name: t("reportsPage.sortAsc") },
    ],
    [t],
  );

  const [locationCache, setLocationCache] = useState(() => {
    // Load cache từ localStorage khi khởi tạo
    try {
      const saved = localStorage.getItem("locationCache");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [fetchingLocations, setFetchingLocations] = useState(new Set()); // Track các location đang được fetch

  // Hàm lấy địa chỉ từ tọa độ với cache và debounce (BE Google → Mapbox → Nominatim; không hiển thị mã bưu chính)
  const fetchLocationDescription = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

    // Kiểm tra cache trước (cả trong state và localStorage)
    if (locationCache[cacheKey]) {
      const normalized =
        formatAddressForUiDisplay(locationCache[cacheKey]) ||
        locationCache[cacheKey];
      if (normalized !== locationCache[cacheKey]) {
        const newCache = { ...locationCache, [cacheKey]: normalized };
        setLocationCache(newCache);
        try {
          localStorage.setItem("locationCache", JSON.stringify(newCache));
        } catch {
          /* ignore */
        }
        return normalized;
      }
      return locationCache[cacheKey];
    }

    // Kiểm tra xem đang fetch location này chưa (tránh duplicate requests)
    if (fetchingLocations.has(cacheKey)) {
      return null; // Đang fetch rồi, không fetch lại
    }

    // Đánh dấu đang fetch
    setFetchingLocations((prev) => new Set(prev).add(cacheKey));

    try {
      // Thêm delay nhỏ để tránh rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      const formattedAddress = await fetchAddressFromCoords(lat, lng);

      if (formattedAddress) {
        // Lưu vào cache (cả state và localStorage)
        const newCache = { ...locationCache, [cacheKey]: formattedAddress };
        setLocationCache(newCache);

        // Lưu vào localStorage để persist
        try {
          localStorage.setItem("locationCache", JSON.stringify(newCache));
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
      setFetchingLocations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  const mergeReportsWithCachedLocations = useCallback((incoming) => {
    const currentCache = JSON.parse(
      localStorage.getItem("locationCache") || "{}",
    );
    return incoming.map((report) => {
      if (report.location_description || !report.lat || !report.lng) {
        return report;
      }
      const cacheKey = `${report.lat.toFixed(6)},${report.lng.toFixed(6)}`;
      const cached = currentCache[cacheKey];
      return cached ? { ...report, location_description: cached } : report;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const currentUser = getCurrentUser();

        let result;
        if (currentUser) {
          result = await fetchAllCrowdReports({ limit: 1000 });
        } else {
          result = await fetchCrowdReports();
        }

        if (cancelled) return;

        if (result.success && result.data) {
          let filteredReports = result.data;
          if (currentUser) {
            filteredReports = result.data.filter((report) => {
              const reportReporterId = report.reporter_id;
              const userId = currentUser.id;
              if (!reportReporterId) return false;
              return (
                String(reportReporterId) === String(userId) ||
                Number(reportReporterId) === Number(userId)
              );
            });
          }

          setReports((prev) => {
            const prevById = new Map(prev.map((r) => [r.id, r]));
            const merged = mergeReportsWithCachedLocations(filteredReports).map(
              (report) => {
                const old = prevById.get(report.id);
                if (old?.location_description && !report.location_description) {
                  return {
                    ...report,
                    location_description: old.location_description,
                  };
                }
                return report;
              },
            );
            return merged;
          });

          if (!silent) {
            const reportsWithoutLocation = filteredReports.filter((report) => {
              if (!report.lat || !report.lng) return false;
              if (report.location_description) return false;
              const cacheKey = `${report.lat.toFixed(6)},${report.lng.toFixed(6)}`;
              const currentCache = JSON.parse(
                localStorage.getItem("locationCache") || "{}",
              );
              return !currentCache[cacheKey];
            });

            const reportsToFetch = reportsWithoutLocation.slice(0, 2);
            for (const report of reportsToFetch) {
              if (cancelled) break;
              const address = await fetchLocationDescription(
                report.lat,
                report.lng,
              );
              if (address && !cancelled) {
                setReports((prevReports) =>
                  prevReports.map((r) =>
                    r.id === report.id
                      ? { ...r, location_description: address }
                      : r,
                  ),
                );
              }
              if (reportsToFetch.indexOf(report) < reportsToFetch.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1100));
              }
            }
          }
        } else if (!silent) {
          setReports([]);
        }
      } catch {
        if (!silent) {
          setReports([]);
        }
      } finally {
        if (!silent && !cancelled) {
          setLoading(false);
        }
      }
    };

    reloadReportsRef.current = () => loadReports(true);
    loadReports(false);
    const interval = setInterval(
      () => loadReports(true),
      POLLING_INTERVALS.CROWD_REPORTS,
    );
    return () => {
      cancelled = true;
      reloadReportsRef.current = null;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeReportsWithCachedLocations]);

  // Hàm lấy status info - ưu tiên moderation_status theo logic đúng
  const getStatusInfo = (report) => {
    // Logic: Nếu moderation_status đã được xử lý (approved/rejected), hiển thị nó
    // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
    const moderationStatus = report.moderation_status;
    const validationStatus = report.validation_status;

    // Nếu đã được moderator xử lý (approved hoặc rejected), ưu tiên hiển thị
    if (moderationStatus === "approved" || moderationStatus === "rejected") {
      if (moderationStatus === "rejected") {
        return {
          text: t("reportUi.moderation.rejected"),
          color: "#dc3545",
          icon: FaXmark,
        };
      }
      // Đã duyệt: màu theo mức độ ngập (Nặng / Trung bình / Nhẹ)
      const levelColors = {
        Nặng: "#dc3545",
        "Trung bình": "#ffc107",
        Nhẹ: "#17a2b8",
      };
      const level =
        report.flood_level && levelColors[report.flood_level]
          ? report.flood_level
          : null;
      const color = level ? levelColors[level] : "#28a745";
      return { text: t("reportUi.moderation.approved"), color, icon: FaCheck };
    }

    // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
    const displayStatus =
      moderationStatus === "pending" || !moderationStatus
        ? validationStatus
        : moderationStatus;

    // Badge mapping cho validation_status
    const statusConfig = {
      pending: {
        text: t("reportUi.moderation.pending"),
        color: "#ffc107",
        icon: FaClock,
      },
      verified: {
        text: t("reportUi.moderation.verified"),
        color: "#17a2b8",
        icon: FaCheck,
      },
      cross_verified: {
        text: t("reportUi.moderation.cross_verified"),
        color: "#28a745",
        icon: FaCheck,
      },
    };

    // Nếu có verified_by_sensor, ưu tiên hiển thị cross_verified
    if (report.verified_by_sensor) {
      return statusConfig.cross_verified;
    }

    return (
      statusConfig[displayStatus] || {
        text: t("reportUi.moderation.unknown"),
        color: "#6c757d",
        icon: FaCircleQuestion,
      }
    );
  };

  const getReliabilityBadge = (score) => {
    if (score >= 81)
      return {
        color: "#28a745",
        text: t("reportUi.confidence.veryHigh"),
        icon: FaStar,
      };
    if (score >= 61)
      return {
        color: "#17a2b8",
        text: t("reportUi.confidence.high"),
        icon: FaCircle,
      };
    if (score >= 31)
      return {
        color: "#ffc107",
        text: t("reportUi.confidence.medium"),
        icon: FaCircle,
      };
    return {
      color: "#dc3545",
      text: t("reportUi.confidence.low"),
      icon: FaCircle,
    };
  };

  const getFloodLevelInfo = (level) => {
    const descFor = (lv) =>
      lv ? t(`reportUi.floodDepth.${lv}`, { defaultValue: lv }) : "";
    const levels = {
      Nhẹ: {
        color: "#17a2b8",
        pillBg: "rgba(23, 162, 184, 0.12)",
        pillText: "#0e7490",
        pillBorder: "rgba(23, 162, 184, 0.35)",
        icon: WiFlood,
        desc: descFor("Nhẹ"),
      },
      "Trung bình": {
        color: "#ffc107",
        pillBg: "rgba(255, 193, 7, 0.15)",
        pillText: "#b45309",
        pillBorder: "rgba(255, 193, 7, 0.45)",
        icon: WiFlood,
        desc: descFor("Trung bình"),
      },
      Nặng: {
        color: "#dc3545",
        pillBg: "rgba(220, 53, 69, 0.1)",
        pillText: "#b91c1c",
        pillBorder: "rgba(220, 53, 69, 0.35)",
        icon: WiFlood,
        desc: descFor("Nặng"),
      },
    };
    return (
      levels[level] || {
        color: "#6c757d",
        pillBg: "#f1f5f9",
        pillText: "#475569",
        pillBorder: "#e2e8f0",
        icon: FaCircleQuestion,
        desc: descFor(level) || level || "—",
      }
    );
  };

  const getStatusPillStyle = (statusInfo) => {
    const byColor = {
      "#dc3545": { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },
      "#ffc107": { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
      "#17a2b8": { bg: "#e0f7fa", text: "#0e7490", border: "#b2ebf2" },
      "#28a745": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
      "#6c757d": { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
    };
    return (
      byColor[statusInfo.color] || {
        bg: "#f1f5f9",
        text: statusInfo.color,
        border: "#e2e8f0",
      }
    );
  };

  const openCreateModal = useCallback(() => {
    if (isGuestBrowseMode()) {
      openRequireLogin(t("reportsPage.loginToCreate"));
      return;
    }
    setCreateFormKey((k) => k + 1);
    setCreateModalOpen(true);
  }, [openRequireLogin, t]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setSearchParams({}, { replace: true });
    if (isGuestBrowseMode()) {
      openRequireLogin(t("reportsPage.loginToCreate"));
      return;
    }
    setCreateFormKey((k) => k + 1);
    setCreateModalOpen(true);
  }, [searchParams, setSearchParams, openRequireLogin, t]);

  const handleCreateReport = openCreateModal;

  /** Địa chỉ hiển thị/tìm: từ API hoặc cache reverse geocoding */
  const getReportAddressForSearch = useCallback(
    (report) => {
      if (report?.location_description)
        return String(report.location_description);
      if (report?.lat != null && report?.lng != null) {
        const lat = Number(report.lat);
        const lng = Number(report.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          const cached = locationCache[cacheKey];
          if (cached) return String(cached);
        }
      }
      return "";
    },
    [locationCache],
  );

  const getReportLocationText = useCallback(
    (report) => {
      const addr = getReportAddressForSearch(report);
      if (addr) return addr;
      if (report.lat != null && report.lng != null) {
        return `${Number(report.lat).toFixed(6)}, ${Number(report.lng).toFixed(6)}`;
      }
      return t("reportUi.noLocationInfo");
    },
    [getReportAddressForSearch, t],
  );

  const completeReportSearch = useCallback(
    (event) => {
      const q = event.query.trim().toLowerCase();
      if (!q) {
        setReportSuggestions([]);
        return;
      }
      const out = [];
      const seen = new Set();
      const add = (s) => {
        if (!s || seen.has(s)) return;
        seen.add(s);
        out.push(s);
      };
      const addSnippet = (text) => {
        if (!text) return;
        const t = String(text);
        const tl = t.toLowerCase();
        if (!tl.includes(q)) return;
        if (t.length <= 120) add(t);
        else {
          const i = tl.indexOf(q);
          const start = Math.max(0, i - 40);
          add(t.slice(start, start + 120));
        }
      };
      for (const r of reports) {
        if (out.length >= 12) break;
        const idStr = r.id != null ? String(r.id) : "";
        if (idStr && idStr.toLowerCase().includes(q)) add(idStr);
      }
      for (const r of reports) {
        if (out.length >= 12) break;
        if (r.reporter_name && r.reporter_name.toLowerCase().includes(q))
          add(r.reporter_name);
      }
      for (const r of reports) {
        if (out.length >= 12) break;
        addSnippet(getReportAddressForSearch(r));
      }
      for (const r of reports) {
        if (out.length >= 12) break;
        if (r.flood_level && r.flood_level.toLowerCase().includes(q))
          add(r.flood_level);
      }
      for (const r of reports) {
        if (out.length >= 12) break;
        if (!r.description) continue;
        addSnippet(r.description);
      }
      setReportSuggestions(out);
    },
    [reports, getReportAddressForSearch],
  );

  const filteredReports = reports.filter((report) => {
    // Filter by expiry (thời hạn)
    const expired = isReportExpired(report, CROWD_REPORT_MAP_DISPLAY_HOURS);
    if (expiryFilter === "active" && expired) return false;
    if (expiryFilter === "expired" && !expired) return false;

    // Filter by status
    let matchesFilter = true;
    if (filter === "verified") {
      matchesFilter = report.moderation_status === "approved";
    } else if (filter === "pending") {
      matchesFilter =
        report.moderation_status === "pending" || !report.moderation_status;
    }

    if (confidenceBand !== "all") {
      const n = report.confidence != null ? Number(report.confidence) : null;
      if (n == null || Number.isNaN(n)) return false;
      if (confidenceBand === "low" && n >= 40) return false;
      if (confidenceBand === "mid" && (n < 40 || n >= 70)) return false;
      if (confidenceBand === "high" && n < 70) return false;
    }

    // Filter by search text (gồm địa chỉ đã có hoặc trong cache)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const addr = getReportAddressForSearch(report);
      const matchesSearch =
        (report.id &&
          report.id.toString().toLowerCase().includes(searchLower)) ||
        (report.reporter_name &&
          report.reporter_name.toLowerCase().includes(searchLower)) ||
        (report.flood_level &&
          report.flood_level.toLowerCase().includes(searchLower)) ||
        (report.description &&
          report.description.toLowerCase().includes(searchLower)) ||
        (addr && addr.toLowerCase().includes(searchLower));

      return matchesFilter && matchesSearch;
    }

    return matchesFilter;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (confidenceSort === "none") return 0;
    const ca = a.confidence != null ? Number(a.confidence) : -1;
    const cb = b.confidence != null ? Number(b.confidence) : -1;
    if (confidenceSort === "desc") return cb - ca;
    if (confidenceSort === "asc") return ca - cb;
    return 0;
  });

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)", // Subtract header height
        display: "flex",
        flexDirection: "column",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      {/* Page Title */}
      <div
        style={{
          backgroundImage: "url(/report.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          marginBottom: "24px",
          boxShadow: "0 4px 12px rgba(25, 118, 210, 0.15)",
          position: "relative",
          overflow: "hidden",
          width: "100%",
          minHeight: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "32px 40px",
        }}
      >
        <h1
          style={{
            margin: "0 0 12px 0",
            fontSize: "2rem",
            color: "white",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {t("reportsPage.pageTitle")}
        </h1>
        <p
          style={{
            margin: "0",
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: "15px",
            fontWeight: "400",
            lineHeight: "1.6",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {t("reportsPage.pageSubtitle")}
        </p>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        <div className="reports-list-shell">
          <div className="reports-list-header">
            <h2>{t("reportsPage.listTitle")}</h2>
            <PrimaryButton type="button" onClick={handleCreateReport}>
              {t("reportsPage.createReportBtn")}
            </PrimaryButton>
          </div>

          <div className="reports-list-toolbar">
            <div className="reports-list-toolbar-inner">
              <div style={{ minWidth: "180px", zIndex: 50 }}>
                <FilterDropdown
                  value={filter}
                  onChange={(e) => setFilter(e.value)}
                  options={filterOptions}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={t("reportsPage.phStatus")}
                  className="filter-dropdown-toolbar w-full"
                />
              </div>

              <div style={{ minWidth: "200px", zIndex: 49 }}>
                <FilterDropdown
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.value)}
                  options={expiryFilterOptions}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={t("reportsPage.phExpiry")}
                  className="filter-dropdown-toolbar w-full"
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: "200px",
                  position: "relative",
                  zIndex: 48,
                }}
              >
                <SearchAutoComplete
                  value={searchText}
                  suggestions={reportSuggestions}
                  completeMethod={completeReportSearch}
                  minLength={0}
                  delay={200}
                  placeholder={t("reportsPage.phSearch")}
                  className="w-full reports-toolbar-search"
                  onChange={(ev) => {
                    const v = ev.value;
                    setSearchText(typeof v === "string" ? v : "");
                  }}
                  onSelect={(ev) => {
                    const v = ev.value;
                    setSearchText(typeof v === "string" ? v : searchText);
                  }}
                />
              </div>

              <FilterDropdown
                value={confidenceBand}
                onChange={(e) => setConfidenceBand(e.value)}
                options={confidenceBandOptions}
                optionLabel="name"
                optionValue="id"
                placeholder={t("reportsPage.phConfidence")}
                aria-label={t("reportsPage.ariaConfidence")}
                className="filter-dropdown-toolbar max-w-[200px]"
              />
              <FilterDropdown
                value={confidenceSort}
                onChange={(e) => setConfidenceSort(e.value)}
                options={confidenceSortOptions}
                optionLabel="name"
                optionValue="id"
                placeholder={t("reportsPage.phSortConf")}
                aria-label={t("reportsPage.ariaSortConf")}
                className="filter-dropdown-toolbar max-w-[240px]"
              />
            </div>
          </div>

          <div className="reports-list-table-wrap">
            {loading ? (
              <div className="reports-list-loading">
                <Skeleton
                  height={28}
                  width={280}
                  style={{ marginBottom: 20 }}
                />

                <Skeleton count={8} height={48} style={{ marginBottom: 8 }} />
              </div>
            ) : sortedReports.length === 0 ? (
              <div className="reports-list-empty">
                <p>{t("reportsPage.emptyTitle")}</p>

                <PrimaryButton type="button" onClick={handleCreateReport}>
                  {t("reportsPage.createReportBtn")}
                </PrimaryButton>
              </div>
            ) : (
              <div className="reports-list-table-scroll">
                <table className="reports-list-table">
                  <thead>
                    <tr>
                      <th>{t("reportsPage.colLevel")}</th>

                      <th>{t("reportsPage.colReporter")}</th>

                      <th>{t("reportsPage.colStatus")}</th>

                      <th>{t("reportsPage.colConfidence")}</th>

                      <th>{t("reportsPage.colLocation")}</th>

                      <th>{t("reportsPage.colCreated")}</th>

                      <th>{t("reportsPage.colSensor")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedReports.map((report, index) => {
                      const statusInfo = getStatusInfo(report);

                      const rel =
                        getReporterReliability(report.reporter_id) ??
                        report.reporter_reliability ??
                        null;

                      const reliabilityInfo = getReliabilityBadge(rel ?? 50);

                      const levelInfo = getFloodLevelInfo(report.flood_level);

                      const statusPill = getStatusPillStyle(statusInfo);

                      const LevelIcon = levelInfo.icon;

                      const StatusIcon = statusInfo.icon;

                      const rowKey = report.id || `report-${index}`;

                      return (
                        <tr key={rowKey}>
                          <td>
                            <div className="reports-level-cell">
                              <span
                                className="reports-level-pill"
                                style={{
                                  background: levelInfo.pillBg,

                                  color: levelInfo.pillText,

                                  border: `1px solid ${levelInfo.pillBorder}`,
                                }}
                              >
                                <LevelIcon
                                  style={{ fontSize: "1rem", flexShrink: 0 }}
                                />

                                {report.flood_level || "—"}
                              </span>

                              {levelInfo.desc ? (
                                <span className="reports-level-desc">
                                  {levelInfo.desc}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td>
                            <div className="reports-reporter-cell">
                              <div className="reports-reporter-name">
                                {report.reporter_name ||
                                  t("reportUi.anonymous")}
                              </div>

                              {rel != null ? (
                                <div className="reports-reporter-meta">
                                  {t("reportsPage.reliabilityLine", {
                                    tier: reliabilityInfo.text,

                                    value:
                                      typeof rel === "number"
                                        ? rel.toFixed(1)
                                        : rel,
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td>
                            <span
                              className="reports-status-pill"
                              style={{
                                background: statusPill.bg,

                                color: statusPill.text,

                                border: `1px solid ${statusPill.border}`,
                              }}
                            >
                              <StatusIcon style={{ fontSize: "0.75rem" }} />

                              {statusInfo.text}
                            </span>
                          </td>

                          <td>
                            {report.confidence != null ? (
                              <ConfidenceBadge
                                confidence={report.confidence}
                                breakdown={report.confidence_breakdown}
                              />
                            ) : (
                              <span className="reports-reporter-meta">—</span>
                            )}
                          </td>

                          <td>
                            <div className="reports-location-cell">
                              <div className="reports-location-inner">
                                <MdLocationOn size={18} />

                                <span>{getReportLocationText(report)}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="reports-datetime">
                              {report.created_at
                                ? new Date(report.created_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </span>
                          </td>

                          <td>
                            {report.verified_by_sensor ? (
                              <span className="reports-sensor-tag">
                                <FaCheck style={{ fontSize: "0.7rem" }} />

                                {t("reportsPage.sensorVerified")}
                              </span>
                            ) : (
                              <span className="reports-reporter-meta">
                                {t("reportsPage.sensorNone")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateReportModal
        open={createModalOpen}
        formKey={createFormKey}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => reloadReportsRef.current?.()}
      />
    </div>
  );
};

export default ReportsPage;
