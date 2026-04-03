import React, { useState } from 'react';
import { getConfidenceTier } from '../../utils/scoringDisplay';
import { cn } from '../../lib/cn';

/**
 * Badge độ tin báo cáo (0–100). breakdown: object từ API (optional).
 */
export default function ConfidenceBadge({ confidence, breakdown, className = '', showBreakdownToggle = false }) {
  const tier = getConfidenceTier(confidence);
  const [open, setOpen] = useState(false);
  if (confidence == null || Number.isNaN(Number(confidence))) return null;
  const n = Math.round(Number(confidence));
  const entries =
    breakdown && typeof breakdown === 'object'
      ? Object.entries(breakdown).filter(([, v]) => v != null && !Number.isNaN(Number(v)))
      : [];

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight"
        style={{
          color: tier?.color || '#475569',
          backgroundColor: tier?.bg || '#f1f5f9',
          borderColor: `${tier?.color || '#cbd5e1'}40`
        }}
        title={`Độ tin báo cáo: ${n}/100`}
      >
        Tin cậy: <strong>{n}</strong>/100
        {tier ? ` · ${tier.label}` : ''}
      </span>
      {showBreakdownToggle && entries.length > 0 && (
        <>
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-[11px] text-blue-600 underline cursor-pointer"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Ẩn chi tiết' : 'Chi tiết điểm'}
          </button>
          {open && (
            <ul className="m-0 max-w-full list-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]">
              {entries.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 py-0.5">
                  <span className="break-words text-slate-500">{k}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {Number(v) > 0 ? '+' : ''}
                    {Number(v).toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
