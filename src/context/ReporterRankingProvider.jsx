import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchReliabilityRanking } from '../services/api';
import { isAdmin, isModerator } from '../utils/auth';

const ReporterRankingContext = createContext(null);

export function useReporterRanking() {
  const ctx = useContext(ReporterRankingContext);
  return ctx || { getReporterReliability: () => null };
}

export function ReporterRankingProvider({ children }) {
  const [mapByReporterId, setMapByReporterId] = useState({});

  useEffect(() => {
    let reqId = 0;
    const load = () => {
      if (!isAdmin() && !isModerator()) {
        setMapByReporterId({});
        return;
      }
      const myId = ++reqId;
      fetchReliabilityRanking(500).then((res) => {
        if (myId !== reqId || !res.success || !Array.isArray(res.data)) return;
        const next = {};
        res.data.forEach((row) => {
          const id = row.reporter_id;
          if (id != null) next[id] = row.avg_reliability != null ? Number(row.avg_reliability) : null;
        });
        setMapByReporterId(next);
      });
    };

    load();
    window.addEventListener('user-updated', load);
    return () => {
      reqId += 1;
      window.removeEventListener('user-updated', load);
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
