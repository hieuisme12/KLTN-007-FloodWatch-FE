import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageWrapper, SectionCard, GridLayout, AlertBanner, LoadingState, SkeletonLoader, Badge } from '@/components/common';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { fetchAdminDevicesHealth, fetchAdminEmergencyAlertsSummary, getOnlineUsersCount } from '@/services/api';
import { getSafeUserFacingError } from '@/utils/safeErrorMessage';

type HealthRow = Record<string, unknown>;

function flattenRows(data: unknown): HealthRow[] {
  if (Array.isArray(data)) return data as HealthRow[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of ['rows', 'devices', 'items', 'sensors', 'data']) {
      const v = o[k];
      if (Array.isArray(v)) return v as HealthRow[];
    }
    return [o as HealthRow];
  }
  return [];
}

function pickColumns(rows: HealthRow[]): DataTableColumn<HealthRow>[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).slice(0, 8);
  return keys.map((key) => ({
    key,
    header: key.replace(/_/g, ' '),
    sortable: true,
    render: (row) => {
      const v = row[key];
      if (v == null) return '—';
      if (typeof v === 'object') return '…';
      const s = String(v);
      return s.length > 80 ? `${s.slice(0, 77)}…` : s;
    }
  }));
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthRows, setHealthRows] = useState<HealthRow[]>([]);
  const [summary, setSummary] = useState<unknown>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, s, oc] = await Promise.all([
        fetchAdminDevicesHealth({}),
        fetchAdminEmergencyAlertsSummary(24),
        getOnlineUsersCount()
      ]);
      if (!h.success) {
        setError(getSafeUserFacingError(h.error));
        setHealthRows([]);
      } else {
        setHealthRows(flattenRows(h.data));
      }
      if (s.success) setSummary(s.data);
      else setSummary(null);
      setOnline(oc.success ? oc.count : null);
    } catch (e) {
      setError(getSafeUserFacingError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => pickColumns(healthRows), [healthRows]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return healthRows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...healthRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'vi') * dir;
    });
  }, [healthRows, sortKey, sortDir]);

  const onSortChange = (key: string, dir: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDir(dir);
  };

  const summaryCards = (
    <GridLayout cols={3} className="mb-6">
      <SectionCard title="Thiết bị / health" description="Theo API admin devices">
        <div className="text-3xl font-bold tabular-nums text-slate-900">{healthRows.length}</div>
        <div className="mt-1 text-xs text-slate-500">Bản ghi sau khi chuẩn hoá</div>
      </SectionCard>
      <SectionCard title="Người dùng online (ước lượng)" description="Endpoint thống kê công khai">
        <div className="text-3xl font-bold tabular-nums text-slate-900">{online ?? '—'}</div>
      </SectionCard>
      <SectionCard title="Cảnh báo khẩn (24h)" description="Tóm tắt admin">
        <div className="text-sm text-slate-700">{summary != null ? <Badge variant="success">Đã tải</Badge> : <Badge variant="warning">Chưa có / không quyền</Badge>}</div>
      </SectionCard>
    </GridLayout>
  );

  return (
    <PageWrapper maxWidthClass="max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan hệ thống</h1>
        <p className="mt-1 text-sm text-slate-600">Bảng dày đặc, phục vụ vận hành — dữ liệu lấy từ API có quyền admin.</p>
      </div>

      {error ? (
        <AlertBanner variant="danger" title="Không tải được một phần dữ liệu" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <div className="space-y-6">
          <SkeletonLoader lines={2} />
          <LoadingState />
        </div>
      ) : (
        <>
          {summaryCards}
          <SectionCard title="Sức khỏe thiết bị" description="Header cố định khi cuộn trong khung; hover hàng." flush>
            <div className="max-h-[min(70vh,560px)] overflow-auto">
              <DataTable<HealthRow>
                columns={columns}
                rows={sortedRows}
                rowKey={(row, idx) => {
                  const id = row.id ?? row.sensor_id ?? row.device_id;
                  if (id != null) return String(id);
                  return idx;
                }}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={onSortChange}
                emptyMessage="Không có dữ liệu health hoặc cần quyền admin."
              />
            </div>
          </SectionCard>
        </>
      )}
    </PageWrapper>
  );
}
