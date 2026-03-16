import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchReliabilityRanking } from '../services/api';

const ReporterRankingContext = createContext(null);

export function ReporterRankingProvider({ children }) {
  const [mapByReporterId, setMapByReporterId] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchReliabilityRanking(500).then((res) => {
      if (cancelled || !res.success || !Array.isArray(res.data)) return;
      const next = {};
      res.data.forEach((row) => {
        const id = row.reporter_id;
        if (id != null) next[id] = row.avg_reliability != null ? Number(row.avg_reliability) : null;
      });
      setMapByReporterId(next);
    });
    return () => { cancelled = true; };
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

export function useReporterRanking() {
  const ctx = useContext(ReporterRankingContext);
  return ctx || { getReporterReliability: () => null };
}
