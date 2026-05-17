import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchReliabilityRanking } from '../services/api';
import { canFetchReliabilityRanking } from '../utils/auth';

const ReporterRankingContext = createContext(null);

export function useReporterRanking() {
  const ctx = useContext(ReporterRankingContext);
  return ctx || { getReporterReliability: () => null };
}

export function ReporterRankingProvider({ children }) {
  const [mapByReporterId, setMapByReporterId] = useState({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!canFetchReliabilityRanking()) {
        if (!cancelled) setMapByReporterId({});
        return;
      }
      const res = await fetchReliabilityRanking(500);
      if (cancelled || !res.success || !Array.isArray(res.data)) return;
      const next = {};
      res.data.forEach((row) => {
        const id = row.reporter_id;
        if (id != null) next[id] = row.avg_reliability != null ? Number(row.avg_reliability) : null;
      });
      setMapByReporterId(next);
    };

    void run();

    const onUserUpdated = () => {
      if (!cancelled) void run();
    };
    window.addEventListener('user-updated', onUserUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('user-updated', onUserUpdated);
    };
  }, []);

  const getReporterReliability = (reporterId) => {
    if (reporterId == null) return null;
    const v = mapByReporterId[reporterId];
    return v != null ? v : null;
  };

  return (
    <ReporterRankingContext.Provider value={{ getReporterReliability }}>
      {children}
    </ReporterRankingContext.Provider>
  );
}
