import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Tag, Table, Progress, Button, Space, Badge, Select } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  AlertOutlined,
  DollarOutlined,
  SearchOutlined,
  RadarChartOutlined,
  FilePdfOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ReferenceDot,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

// Data Klaster K-Means (X2 = Rasio Biaya, X1 = Frekuensi Servis, X3 = Durasi Sirkulasi)
const normalCluster = [
  { kode: '3100102001', nama: 'Server Dell R740', x2: 0.12, x1: 0.10, x3: 15 },
  { kode: '3100102004', nama: 'UPS APC 3000VA', x2: 0.18, x1: 0.15, x3: 10 },
  { kode: '3100102008', nama: 'Switch HP Aruba 2930F', x2: 0.08, x1: 0.12, x3: 12 },
  { kode: '3100102011', nama: 'PC Workstation Lenovo', x2: 0.22, x1: 0.20, x3: 18 },
];

const waspadaCluster = [
  { kode: '3100102014', nama: 'Switch Core Cisco 9300', x2: 0.48, x1: 0.45, x3: 35 },
  { kode: '3100102019', nama: 'Firewall Fortigate 100F', x2: 0.55, x1: 0.50, x3: 28 },
  { kode: '3100102022', nama: 'Access Point Ubiquiti', x2: 0.42, x1: 0.58, x3: 40 },
];

const anomaliCluster = [
  { kode: '3100102029', nama: 'Router Mikrotik CCR1036', x2: 0.89, x1: 0.91, x3: 64 },
  { kode: '3100102042', nama: 'Laptop ThinkPad X1', x2: 0.93, x1: 0.85, x3: 52 },
  { kode: '3100102055', nama: 'Radio HT Digital Motorola', x2: 0.81, x1: 0.88, x3: 48 },
];

const centroidsData = [
  { kode: 'Centroid 1 (Normal)', x2: 0.15, x1: 0.14, x3: 60 },
  { kode: 'Centroid 2 (Waspada)', x2: 0.48, x1: 0.51, x3: 60 },
  { kode: 'Centroid 3 (Anomali)', x2: 0.88, x1: 0.88, x3: 60 },
];

// Data Kurva Elbow (K=1..8)
const elbowData = [
  { k: 1, sse: 48.2 },
  { k: 2, sse: 23.6 },
  { k: 3, sse: 12.48 },
  { k: 4, sse: 9.8 },
  { k: 5, sse: 8.1 },
  { k: 6, sse: 6.9 },
  { k: 7, sse: 5.8 },
  { k: 8, sse: 5.1 },
];

// Tren Biaya Pemeliharaan vs Depresiasi per Bulan (dalam Juta Rp)
const trendData = [
  { bulan: 'Jun', biaya_servis: 18500000, depresiasi: 28000000 },
  { bulan: 'Jul', biaya_servis: 21000000, depresiasi: 28000000 },
  { bulan: 'Agu', biaya_servis: 24500000, depresiasi: 28500000 },
  { bulan: 'Sep', biaya_servis: 36800000, depresiasi: 28500000 },
  { bulan: 'Okt', biaya_servis: 44200000, depresiasi: 29000000 },
  { bulan: 'Nov', biaya_servis: 42500000, depresiasi: 29000000 },
];

// Kondisi Fisik BMN
const kondisiData = [
  { name: 'Baik (B)', value: 214, color: '#52c41a' },
  { name: 'Rusak Ringan (RR)', value: 24, color: '#faad14' },
  { name: 'Rusak Berat (RB)', value: 10, color: '#ff4d4f' },
];

const earlyWarningRows = [
  {
    key: '1',
    kode_bmn: '3100102029',
    perangkat: 'Router Mikrotik CCR1036',
    nilai_buku: 12500000,
    biaya_servis: 11200000,
    rasio_persen: 90,
    frekuensi_x1: 7,
    durasi_x3: 64,
    jarak_euclidean: 0.142,
    indikasi: 'Mark-up Biaya & Servis Berulang',
    level: 'Merah',
    status_audit: 'Belum Diinvestigasi',
  },
  {
    key: '2',
    kode_bmn: '3100102042',
    perangkat: 'Laptop Operasional ThinkPad X1',
    nilai_buku: 18000000,
    biaya_servis: 16800000,
    rasio_persen: 93,
    frekuensi_x1: 6,
    durasi_x3: 52,
    jarak_euclidean: 0.189,
    indikasi: 'Rasio Biaya Servis > 90% Nilai Buku',
    level: 'Merah',
    status_audit: 'Belum Diinvestigasi',
  },
  {
    key: '3',
    kode_bmn: '3100102014',
    perangkat: 'Switch Core Cisco Catalyst 9300',
    nilai_buku: 42000000,
    biaya_servis: 19500000,
    rasio_persen: 46,
    frekuensi_x1: 4,
    durasi_x3: 35,
    jarak_euclidean: 0.215,
    indikasi: 'Keterlambatan Sirkulasi Aset',
    level: 'Kuning',
    status_audit: 'Wajar / Terbukti Rusak',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('2026');

  const columns = [
    { title: 'Kode BMN', dataIndex: 'kode_bmn', key: 'kode_bmn' },
    { title: 'Perangkat TIK', dataIndex: 'perangkat', key: 'perangkat' },
    { title: 'Nilai Buku (Rp)', dataIndex: 'nilai_buku', key: 'nilai_buku', render: (v) => formatRupiah(v) },
    { title: 'Akumulasi Servis (Rp)', dataIndex: 'biaya_servis', key: 'biaya_servis', render: (v) => formatRupiah(v) },
    {
      title: 'Rasio Biaya',
      dataIndex: 'rasio_persen',
      key: 'rasio_persen',
      width: 175,
      render: (pct) => (
        <div style={{ minWidth: 145 }}>
          <Progress
            percent={pct}
            size="small"
            strokeColor={pct >= 80 ? '#ff4d4f' : pct >= 45 ? '#faad14' : '#52c41a'}
            format={(p) => `${p}%`}
          />
        </div>
      ),
    },
    { title: 'Frek. (X1)', dataIndex: 'frekuensi_x1', key: 'frekuensi_x1', render: (v) => `${v}x` },
    { title: 'Durasi (X3)', dataIndex: 'durasi_x3', key: 'durasi_x3', render: (v) => `${v} hr` },
    { title: 'Jarak Euclidean', dataIndex: 'jarak_euclidean', key: 'jarak_euclidean', render: (v) => v.toFixed(3) },
    { title: 'Jenis Indikasi Anomali', dataIndex: 'indikasi', key: 'indikasi' },
    {
      title: 'Level Alert',
      dataIndex: 'level',
      key: 'level',
      render: (l) => (
        <Tag color={l === 'Merah' ? '#cf1322' : '#d48806'} style={{ margin: 0, fontWeight: 600 }}>
          {l}
        </Tag>
      ),
    },
    {
      title: 'Status Audit',
      dataIndex: 'status_audit',
      key: 'status_audit',
      render: (s) => (
        <Tag color={s === 'Belum Diinvestigasi' ? '#d4380d' : '#389e0d'} style={{ margin: 0 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      render: () => (
        <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => navigate('/early-warning')}>
          Investigasi / Detail
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '4px 20px 20px' }}>
      <Row gutter={[16, 12]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>Dashboard Eksekutif BMN - SIM-ASET BID TIK POLDA DIY</h2>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 6 }} />
            Pemantauan Inventaris TIK, Depresiasi &amp; Early Warning K-Means | Update: 26/11/2026
          </span>
        </Col>
        <Col>
          <Space wrap>
            <Select
              value={periode}
              onChange={setPeriode}
              style={{ width: 175 }}
              options={[
                { value: '2026', label: 'Tahun Anggaran 2026' },
                { value: 'sem2', label: 'Semester II 2026' },
                { value: 'all', label: 'Semua (2021-2026)' },
              ]}
            />
            <Button icon={<RadarChartOutlined />} onClick={() => navigate('/kmeans-analytics')}>
              Analitik K-Means
            </Button>
            <Button type="primary" icon={<FilePdfOutlined />} onClick={() => navigate('/laporan')}>
              Cetak Laporan PDF
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Kartu KPI Utama */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Total Aset TIK (BMN)" value={248} prefix={<LaptopOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Kondisi Baik (B)" value={214} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Dalam Pemeliharaan / QC" value={14} valueStyle={{ color: '#fa8c16' }} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Alert Indikasi Fraud (K-Means)" value={3} valueStyle={{ color: '#cf1322' }} prefix={<AlertOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Total Nilai Buku Aset TIK (Rp)" value={formatRupiah(3450000000)} prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Total Realisasi Biaya Pemeliharaan (Rp)" value={formatRupiah(187500000)} valueStyle={{ color: '#1677ff' }} prefix={<ToolOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Grid 2x2 Grafik Visualisasi Interaktif */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Grafik 1: Scatter Plot Klaster K-Means */}
        <Col xs={24} lg={12}>
          <Card
            title="Sebaran Klaster K-Means (K=3) · Ukuran Titik = Durasi X3"
            bordered={false}
            className="whiteBox shadow"
          >
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x2" name="Rasio Biaya (X2)" domain={[0, 1]} />
                <YAxis type="number" dataKey="x1" name="Frekuensi Servis (X1)" domain={[0, 1]} />
                <ZAxis type="number" dataKey="x3" range={[60, 260]} name="Durasi Pinjam (X3)" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Klaster Normal" data={normalCluster} fill="#52c41a" />
                <Scatter name="Klaster Waspada" data={waspadaCluster} fill="#faad14" />
                <Scatter name="Anomali / Indikasi Fraud" data={anomaliCluster} fill="#ff4d4f" />
                <Scatter name="Centroid Akhir" data={centroidsData} fill="#1d39c4" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 2: Line Chart Kurva Elbow SSE/WCSS & Skor Silhouette */}
        <Col xs={24} lg={12}>
          <Card
            title="Kurva Elbow Method (SSE / WCSS) & Skor Silhouette"
            bordered={false}
            className="whiteBox shadow"
            extra={
              <Space>
                <Badge status="processing" text="Silhouette:" />
                <Tag color="#389e0d" style={{ margin: 0, fontWeight: 600 }}>0.684 (K=3)</Tag>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={elbowData} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="k" tickFormatter={(v) => `K=${v}`} />
                <YAxis />
                <Tooltip formatter={(v) => [v, 'SSE / WCSS']} labelFormatter={(k) => `Jumlah Klaster K=${k}`} />
                <Line type="monotone" dataKey="sse" stroke="#1677ff" strokeWidth={2.5} dot={{ r: 4 }} />
                <ReferenceDot x={3} y={12.48} r={7} fill="#ff4d4f" stroke="#fff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Indikator Kualitas Klaster (Silhouette Coefficient):</span>
              <Progress percent={68.4} size="small" status="active" format={(p) => `${(p / 100).toFixed(3)}`} />
            </div>
          </Card>
        </Col>

        {/* Grafik 3: Bar Chart Tren Biaya Pemeliharaan vs Depresiasi */}
        <Col xs={24} lg={12}>
          <Card
            title="Tren Biaya Pemeliharaan vs Depresiasi Periodik BMN (Rp)"
            bordered={false}
            className="whiteBox shadow"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData} margin={{ top: 10, right: 16, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)} Jt`} />
                <Tooltip formatter={(val) => formatRupiah(val)} />
                <Legend />
                <Bar dataKey="biaya_servis" name="Biaya Pemeliharaan (Rp)" fill="#1677ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depresiasi" name="Depresiasi Periodik (Rp)" fill="#8c8c8c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 4: Donut Chart Kondisi Fisik & Status Operasional */}
        <Col xs={24} lg={12}>
          <Card
            title="Proporsi Kondisi Fisik & Status Operasional Aset TIK"
            bordered={false}
            className="whiteBox shadow"
          >
            <ResponsiveContainer width="100%" height={225}>
              <PieChart>
                <Pie
                  data={kondisiData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {kondisiData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Tag color="#0958d9">Tersedia: 186 Unit</Tag>
              <Tag color="#d48806">Dipinjam: 48 Unit</Tag>
              <Tag color="#531dab">Dalam Servis: 14 Unit</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabel Detail Early Warning Fraud Terbaru */}
      <Card
        title="Ringkasan Early Warning Fraud Terbaru (Klaster Anomali K-Means)"
        bordered={false}
        className="whiteBox shadow"
        style={{ marginTop: 16 }}
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={earlyWarningRows}
          pagination={false}
          scroll={{ x: 1350 }}
        />
      </Card>
    </div>
  );
}
