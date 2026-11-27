import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Card, Select, Space, Table, Tag } from 'antd';
import { BellOutlined, SyncOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { request } from '@/request';
import { useDate } from '@/settings';
import { useSecureNavigate } from '@/utils/urlSecurity';

export default function NotifikasiPage() {
  const navigate = useSecureNavigate();
  const { formatDateTime } = useDate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [rangeFilter, setRangeFilter] = useState('all');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await request.get({ entity: 'notifications' });
      if (res?.success && Array.isArray(res?.result)) {
        setItems(res.result);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const categories = Array.from(new Set(items.map((i) => i.kategori).filter(Boolean)));
  const todayStart = dayjs().startOf('day').valueOf();
  const yesterdayStart = dayjs().subtract(1, 'day').startOf('day').valueOf();
  const threeDaysStart = dayjs().subtract(3, 'day').startOf('day').valueOf();
  const sevenDaysStart = dayjs().subtract(7, 'day').startOf('day').valueOf();
  const thirtyDaysStart = dayjs().subtract(30, 'day').startOf('day').valueOf();

  const filteredItems = items.filter((i) => {
    if (kategoriFilter !== 'ALL' && i.kategori !== kategoriFilter) return false;
    const ts = Number(i.ts || 0);
    if (rangeFilter === 'today') return ts >= todayStart;
    if (rangeFilter === 'yesterday') return ts >= yesterdayStart && ts < todayStart;
    if (rangeFilter === '3d') return ts >= threeDaysStart && ts < yesterdayStart;
    if (rangeFilter === '7d') return ts >= sevenDaysStart && ts < threeDaysStart;
    if (rangeFilter === '30d') return ts >= thirtyDaysStart && ts < sevenDaysStart;
    return true;
  });

  const columns = [
    {
      title: 'Tanggal & Jam',
      dataIndex: 'waktu',
      key: 'waktu',
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (val, record) => (record.ts ? formatDateTime(record.ts) : val),
    },
    {
      title: 'Modul / Kategori',
      dataIndex: 'kategori',
      key: 'kategori',
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (k) => <Tag color="#1d39c4" style={{ margin: 0 }}>{k}</Tag>,
    },
    {
      title: 'Notifikasi & Keterangan',
      key: 'detail',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.title}</div>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>{record.desc}</div>
        </div>
      ),
    },
    {
      title: 'Status / Tingkat',
      dataIndex: 'tag',
      key: 'tag',
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (t, record) => (
        <Tag color={record.color || '#0958d9'} style={{ margin: 0, fontWeight: 600 }}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => (
        <Button type="primary" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(record.path)}>
          Buka Modul
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card
        title={
          <span>
            <BellOutlined style={{ color: '#cf1322', marginRight: 8 }} />
            Pusat Notifikasi & Peringatan Sistem ({filteredItems.length})
          </span>
        }
        extra={
          <Space wrap>
            <Select
              value={rangeFilter}
              onChange={setRangeFilter}
              style={{ minWidth: 175 }}
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
              value={kategoriFilter}
              onChange={setKategoriFilter}
              style={{ minWidth: 190 }}
              options={[
                { value: 'ALL', label: 'Semua Kategori' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
            <Button icon={<SyncOutlined />} onClick={loadNotifications} loading={loading}>
              Refresh
            </Button>
          </Space>
        }
        bordered={false}
        className="whiteBox shadow"
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredItems}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}

