import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { AlertOutlined, AuditOutlined, ClearOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { request } from '@/request';
import { useDate } from '@/settings';

const PREVIEW_ALERTS = [
  {
    _id: 'alert-1',
    kode_bmn: '3100102029',
    nama_perangkat: 'Router Mikrotik CCR1036',
    tingkat_risiko: 'Merah',
    indikasi: 'Frekuensi servis tinggi (X1=0.91) & rasio biaya servis melampaui nilai buku (X2=0.88)',
    status_audit: 'Belum Diinvestigasi',
  },
  {
    _id: 'alert-2',
    kode_bmn: '3100102042',
    nama_perangkat: 'Laptop Operasional ThinkPad X1',
    tingkat_risiko: 'Merah',
    indikasi: 'Biaya perbaikan berulang tidak wajar (X2=0.94)',
    status_audit: 'Belum Diinvestigasi',
  },
  {
    _id: 'alert-3',
    kode_bmn: '3100102014',
    nama_perangkat: 'Switch Core Cisco Catalyst 9300',
    tingkat_risiko: 'Kuning',
    indikasi: 'Keterlambatan pengembalian sirkulasi peminjaman (X3=0.35)',
    status_audit: 'Wajar / Terbukti Rusak',
  },
];

export default function EarlyWarningPage() {
  const { formatDateTime } = useDate();
  const [alerts, setAlerts] = useState(PREVIEW_ALERTS);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('latest');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form] = Form.useForm();

  const statusOptions = useMemo(() => {
    const base = [
      'Belum Diinvestigasi',
      'Wajar / Terbukti Rusak',
      'Mark-up Biaya',
      'Servis Fiktif',
      'Penyalahgunaan Sirkulasi',
    ];
    const fromData = alerts.map((a) => a.status_audit).filter(Boolean);
    const merged = Array.from(new Set([...base, ...fromData]));
    return [
      { value: 'ALL', label: 'Semua Status Audit' },
      ...merged.map((s) => ({ value: s, label: s })),
    ];
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let source = alerts;
    if (viewMode === 'latest') {
      const seen = new Set();
      source = alerts.filter((a) => {
        const key = a.kode_bmn || a._id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const todayStart = dayjs().startOf('day').valueOf();
    const yesterdayStart = dayjs().subtract(1, 'day').startOf('day').valueOf();
    const threeDaysStart = dayjs().subtract(3, 'day').startOf('day').valueOf();
    const sevenDaysStart = dayjs().subtract(7, 'day').startOf('day').valueOf();
    const thirtyDaysStart = dayjs().subtract(30, 'day').startOf('day').valueOf();
    const q = searchText.trim().toLowerCase();

    return source.filter((a) => {
      if (riskFilter !== 'ALL' && a.tingkat_risiko !== riskFilter) return false;
      if (statusFilter !== 'ALL' && a.status_audit !== statusFilter) return false;
      if (rangeFilter !== 'all') {
        const ts = a.created_at ? new Date(a.created_at).getTime() : 0;
        if (rangeFilter === 'today' && !(ts >= todayStart)) return false;
        if (rangeFilter === 'yesterday' && !(ts >= yesterdayStart && ts < todayStart)) return false;
        if (rangeFilter === '3d' && !(ts >= threeDaysStart && ts < yesterdayStart)) return false;
        if (rangeFilter === '7d' && !(ts >= sevenDaysStart && ts < threeDaysStart)) return false;
        if (rangeFilter === '30d' && !(ts >= thirtyDaysStart && ts < sevenDaysStart)) return false;
      }
      if (q) {
        const hay = `${a.kode_bmn || ''} ${a.nama_perangkat || ''} ${a.indikasi || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [alerts, viewMode, rangeFilter, searchText, riskFilter, statusFilter]);

  const hasActiveFilter =
    Boolean(searchText.trim()) ||
    viewMode !== 'latest' ||
    rangeFilter !== 'all' ||
    riskFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchText('');
    setViewMode('latest');
    setRangeFilter('all');
    setRiskFilter('ALL');
    setStatusFilter('ALL');
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await request.get({ entity: 'alerts' });
      if (res?.success && Array.isArray(res?.result)) {
        setAlerts(res.result);
      }
    } catch {
      // Gunakan data preview jika backend belum menyediakan /api/alerts
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleOpenAudit = (record) => {
    setSelectedAlert(record);
    form.setFieldsValue({
      hasil_investigasi: 'Mark-up Biaya',
      catatan_auditor: '',
    });
  };

  const handleSubmitAudit = async (values) => {
    try {
      await request.post({ entity: `audit/${selectedAlert._id}`, jsonData: values });
      message.success('Hasil audit investigasi berhasil disimpan!');
    } catch {
      message.success('Hasil audit dicatat pada simulasi UI.');
    }
    setAlerts((prev) =>
      prev.map((a) => (a._id === selectedAlert._id ? { ...a, status_audit: values.hasil_investigasi } : a))
    );
    setSelectedAlert(null);
  };

  const columns = [
    {
      title: 'Tanggal & Jam',
      dataIndex: 'created_at',
      key: 'created_at',
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (dt) => (dt ? formatDateTime(dt) : '-'),
    },
    { title: 'Kode BMN', dataIndex: 'kode_bmn', key: 'kode_bmn' },
    { title: 'Perangkat TIK', dataIndex: 'nama_perangkat', key: 'nama_perangkat' },
    {
      title: 'Tingkat Risiko',
      dataIndex: 'tingkat_risiko',
      key: 'tingkat_risiko',
      render: (r) => (
        <Tag color={r === 'Merah' ? '#cf1322' : '#d48806'} style={{ margin: 0, fontWeight: 600 }}>
          {r}
        </Tag>
      ),
    },
    { title: 'Indikasi Anomali (K-Means)', dataIndex: 'indikasi', key: 'indikasi' },
    {
      title: 'Status Audit Investigasi',
      dataIndex: 'status_audit',
      key: 'status_audit',
      render: (s) => (
        <Tag color={s === 'Belum Diinvestigasi' ? '#d4380d' : '#389e0d'} style={{ margin: 0 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Aksi Auditor',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" size="small" icon={<AuditOutlined />} onClick={() => handleOpenAudit(record)}>
          Audit Investigasi
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card
        title={
          <span>
            <AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            Early Warning Alert & Audit Investigasi (Pengawas Internal) ({filteredAlerts.length})
          </span>
        }
        extra={
          <Button icon={<SyncOutlined />} onClick={fetchAlerts} loading={loading}>
            Refresh
          </Button>
        }
        bordered={false}
        className="whiteBox shadow"
      >
        <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              placeholder="Cari Kode BMN, perangkat, atau indikasi..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              value={viewMode}
              onChange={setViewMode}
              style={{ minWidth: 165 }}
              options={[
                { value: 'latest', label: 'Terbaru per Aset' },
                { value: 'all', label: 'Semua Riwayat' },
              ]}
            />
            <Select
              value={rangeFilter}
              onChange={setRangeFilter}
              style={{ minWidth: 170 }}
              options={[
                { value: 'all', label: 'Sepanjang Masa' },
                { value: 'today', label: 'Hari Ini' },
                { value: 'yesterday', label: 'Kemarin' },
                { value: '3d', label: '2 - 3 Hari yang Lalu' },
                { value: '7d', label: '4 - 7 Hari yang Lalu' },
                { value: '30d', label: '8 - 30 Hari yang Lalu' },
              ]}
            />
            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              style={{ minWidth: 160 }}
              options={[
                { value: 'ALL', label: 'Semua Tingkat Risiko' },
                { value: 'Merah', label: 'Merah (Anomali)' },
                { value: 'Kuning', label: 'Kuning (Waspada)' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ minWidth: 200 }}
              options={statusOptions}
            />
            {hasActiveFilter && (
              <Button icon={<ClearOutlined />} onClick={handleResetFilters}>
                Reset Filter
              </Button>
            )}
          </Space>
        </Space>
        <Table rowKey="_id" columns={columns} dataSource={filteredAlerts} loading={loading} pagination={{ pageSize: 10 }} />
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12.5,
            color: '#475569',
          }}
        >
          <strong style={{ color: '#0f172a' }}>Keterangan Tingkat Risiko:</strong>
          <div>
            <Tag color="#cf1322" style={{ marginRight: 8, fontWeight: 600 }}>Merah</Tag>
            Anomali / Indikasi Fraud (servis berulang tinggi, biaya ekstrem, atau durasi tidak wajar; wajib investigasi)
          </div>
          <div>
            <Tag color="#d48806" style={{ marginRight: 8, fontWeight: 600 }}>Kuning</Tag>
            Waspada (mulai terjadi kenaikan durasi sirkulasi atau biaya pemeliharaan; perlu pemantauan)
          </div>
          <div>
            <Tag color="#389e0d" style={{ marginRight: 8, fontWeight: 600 }}>Hijau</Tag>
            Normal (pemeliharaan dan pemakaian perangkat masih dalam batas wajar)
          </div>
        </div>
      </Card>

      <Modal
        title={`Form Audit Investigasi - ${selectedAlert?.kode_bmn || ''}`}
        open={Boolean(selectedAlert)}
        onCancel={() => setSelectedAlert(null)}
        onOk={() => form.submit()}
        okText="Simpan Hasil Audit"
        cancelText="Batal"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitAudit}>
          <Form.Item name="hasil_investigasi" label="Kesimpulan Audit Lapangan" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'Wajar / Terbukti Rusak', label: 'Wajar / Terbukti Rusak' },
                { value: 'Mark-up Biaya', label: 'Indikasi Mark-up Biaya Servis' },
                { value: 'Servis Fiktif', label: 'Indikasi Servis Fiktif' },
                { value: 'Penyalahgunaan Sirkulasi', label: 'Penyalahgunaan / Keterlambatan Sirkulasi' },
              ]}
            />
          </Form.Item>
          <Form.Item name="catatan_auditor" label="Catatan & Rekomendasi Pengawas Internal" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Tuliskan temuan inspeksi fisik & rekomendasi tindak lanjut..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

