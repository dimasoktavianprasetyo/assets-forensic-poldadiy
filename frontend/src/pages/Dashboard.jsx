import { useEffect, useState } from 'react';
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
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { request } from '@/request';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const FALLBACK_SUMMARY = {
  kpi: {
    total_aset: 10,
    kondisi_baik: 5,
    dalam_servis: 3,
    alert_count: 5,
    total_nilai_buku: 120000000,
    total_biaya_servis: 60100000,
  },
  kondisiData: [
    { name: 'Baik (B)', value: 5, color: '#52c41a' },
    { name: 'Rusak Ringan (RR)', value: 4, color: '#faad14' },
    { name: 'Rusak Berat (RB)', value: 1, color: '#ff4d4f' },
  ],
  statusCounts: { tersedia: 4, dipinjam: 3, servis: 3 },
  trendData: [
    { bulan: 'Jun', biaya_servis: 5200000, depresiasi: 5000000 },
    { bulan: 'Jul', biaya_servis: 7000000, depresiasi: 5000000 },
    { bulan: 'Agu', biaya_servis: 8900000, depresiasi: 5000000 },
    { bulan: 'Sep', biaya_servis: 2500000, depresiasi: 5000000 },
    { bulan: 'Okt', biaya_servis: 4100000, depresiasi: 5000000 },
    { bulan: 'Nov', biaya_servis: 0, depresiasi: 5000000 },
  ],
  kmeans: {
    nilai_k: 3,
    sse_score: 1.0356,
    silhouette_score: 0.3971,
    elbow: [],
    centroids: [],
    items: [],
  },
  earlyWarningRows: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(FALLBACK_SUMMARY);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const res = await request.get({ entity: `dashboard/summary?periode=${periode}` });
        if (res?.success && res?.result) {
          setSummary(res.result);
        }
      } catch {
        // Fallback jika backend belum siap
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [periode]);

  const kmItems = summary.kmeans?.items || [];
  const normalCluster = kmItems
    .filter((i) => i.klaster === 'Normal')
    .map((i) => ({ kode: i.kode_bmn, nama: i.nama_perangkat, x2: Number(i.x2), x1: Number(i.x1), x3: Number(i.x3_raw || 10) }));
  const waspadaCluster = kmItems
    .filter((i) => i.klaster === 'Waspada')
    .map((i) => ({ kode: i.kode_bmn, nama: i.nama_perangkat, x2: Number(i.x2), x1: Number(i.x1), x3: Number(i.x3_raw || 25) }));
  const anomaliCluster = kmItems
    .filter((i) => i.klaster?.includes('Anomali'))
    .map((i) => ({ kode: i.kode_bmn, nama: i.nama_perangkat, x2: Number(i.x2), x1: Number(i.x1), x3: Number(i.x3_raw || 50) }));
  const centroidsData = (summary.kmeans?.centroids || []).map((c) => ({
    kode: `Centroid (${c.klaster})`,
    x2: Number(c.centroid_biaya_servis),
    x1: Number(c.centroid_frekuensi),
    x3: 60,
  }));

  const elbowData = summary.kmeans?.elbow || [];
  const elbowK3 = elbowData.find((e) => e.k === 3)?.sse ?? summary.kmeans?.sse_score ?? 0;
  const silScore = Number(summary.kmeans?.silhouette_score || 0);

  // Grafik 5: Proyeksi 12 Bulan Nilai Buku BMN vs Akumulasi Biaya Servis (±10%)
  const forecastMonths = ['Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'];
  const startNilaiBuku = Number(summary.kpi?.total_nilai_buku || 120000000);
  const monthlyDep = Number(summary.kpi?.depresiasi_bulanan || 4500000);
  const startBiaya = Number(summary.kpi?.total_biaya_servis || 60100000);
  const monthlyMaintAvg = Math.max(1500000, Math.round(startBiaya / 12));
  const forecastData = forecastMonths.map((bulan, idx) => {
    const nb = Math.max(0, Math.round(startNilaiBuku - monthlyDep * (idx + 1)));
    const bs = Math.round(startBiaya + monthlyMaintAvg * (idx + 1));
    return {
      bulan,
      nilai_buku: nb,
      nilai_buku_band: [Math.round(nb * 0.9), Math.round(nb * 1.1)],
      biaya_servis: bs,
      biaya_band: [Math.round(bs * 0.9), Math.round(bs * 1.1)],
    };
  });

  // Grafik 6: Bubble Chart Sebaran Nilai Perolehan vs Total Biaya Servis (Ukuran = Skor Risiko)
  const bubbleItems = (summary.kmeans?.items || []).map((item) => ({
    ...item,
    nilai_perolehan_jt: Number(((Number(item.nilai_perolehan || item.nilai_buku_rp || 25000000)) / 1000000).toFixed(2)),
    biaya_jt: Number(((Number(item.total_biaya_rp || Number(item.x2 || 0) * 12000000)) / 1000000).toFixed(2)),
    risiko: Number(item.risiko || 20),
  }));
  const bubbleNormal = bubbleItems.filter((i) => i.klaster === 'Normal');
  const bubbleWaspada = bubbleItems.filter((i) => i.klaster === 'Waspada');
  const bubbleAnomali = bubbleItems.filter((i) => String(i.klaster || '').includes('Anomali'));

  const nowrapCell = () => ({ style: { whiteSpace: 'nowrap' } });
  const columns = [
    { title: 'Kode BMN', dataIndex: 'kode_bmn', key: 'kode_bmn', onCell: nowrapCell },
    { title: 'Perangkat TIK', dataIndex: 'perangkat', key: 'perangkat', onCell: nowrapCell },
    { title: 'Nilai Buku (Rp)', dataIndex: 'nilai_buku', key: 'nilai_buku', onCell: nowrapCell, render: (v) => formatRupiah(v) },
    { title: 'Akumulasi Servis (Rp)', dataIndex: 'biaya_servis', key: 'biaya_servis', onCell: nowrapCell, render: (v) => formatRupiah(v) },
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
    { title: 'Frek. (X1)', dataIndex: 'frekuensi_x1', key: 'frekuensi_x1', onCell: nowrapCell, render: (v) => `${v}x` },
    { title: 'Durasi (X3)', dataIndex: 'durasi_x3', key: 'durasi_x3', onCell: nowrapCell, render: (v) => `${v} hr` },
    { title: 'Jarak Euclidean', dataIndex: 'jarak_euclidean', key: 'jarak_euclidean', onCell: nowrapCell, render: (v) => Number(v).toFixed(3) },
    {
      title: 'Jenis Indikasi Anomali',
      dataIndex: 'indikasi',
      key: 'indikasi',
      width: 340,
      onCell: () => ({ style: { minWidth: 280 } }),
    },
    {
      title: 'Level Alert',
      dataIndex: 'level',
      key: 'level',
      onCell: nowrapCell,
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
      onCell: nowrapCell,
      render: (s) => (
        <Tag color={s === 'Belum Diinvestigasi' ? '#d4380d' : '#389e0d'} style={{ margin: 0 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      onCell: nowrapCell,
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
          <Card bordered={false} className="whiteBox shadow" loading={loading}>
            <Statistic title="Total Aset TIK (BMN)" value={summary.kpi.total_aset} prefix={<LaptopOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow" loading={loading}>
            <Statistic title="Kondisi Baik (B)" value={summary.kpi.kondisi_baik} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow" loading={loading}>
            <Statistic title="Dalam Pemeliharaan / QC" value={summary.kpi.dalam_servis} valueStyle={{ color: '#fa8c16' }} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="whiteBox shadow" loading={loading}>
            <Statistic title="Alert Indikasi Fraud (K-Means)" value={summary.kpi.alert_count} valueStyle={{ color: '#cf1322' }} prefix={<AlertOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card bordered={false} className="whiteBox shadow" loading={loading}>
            <Statistic title="Total Nilai Buku Aset TIK (Rp)" value={formatRupiah(summary.kpi.total_nilai_buku)} prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card bordered={false} className="whiteBox shadow" loading={loading}>
            <Statistic title="Total Realisasi Biaya Pemeliharaan (Rp)" value={formatRupiah(summary.kpi.total_biaya_servis)} valueStyle={{ color: '#1677ff' }} prefix={<ToolOutlined />} />
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
                <Tag color="#389e0d" style={{ margin: 0, fontWeight: 600 }}>
                  {silScore.toFixed(3)} (K=3)
                </Tag>
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
                {elbowK3 > 0 && (
                  <ReferenceDot x={3} y={elbowK3} r={7} fill="#ff4d4f" stroke="#fff" strokeWidth={2} />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Indikator Kualitas Klaster (Silhouette Coefficient):</span>
              <Progress percent={Math.round(silScore * 1000) / 10} size="small" status="active" format={() => silScore.toFixed(3)} />
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
              <BarChart data={summary.trendData} margin={{ top: 10, right: 16, bottom: 5, left: 10 }}>
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
                  data={summary.kondisiData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {summary.kondisiData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Tag color="#0958d9">Tersedia: {summary.statusCounts.tersedia} Unit</Tag>
              <Tag color="#d48806">Dipinjam: {summary.statusCounts.dipinjam} Unit</Tag>
              <Tag color="#531dab">Dalam Servis: {summary.statusCounts.servis} Unit</Tag>
            </div>
          </Card>
        </Col>

        {/* Grafik 5: Proyeksi 12 Bulan Nilai Buku BMN vs Biaya Pemeliharaan (±10%) */}
        <Col xs={24} lg={12}>
          <Card
            title="Proyeksi 12 Bulan Nilai Buku BMN vs Akumulasi Biaya Servis (±10%)"
            bordered={false}
            className="whiteBox shadow"
          >
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={forecastData} margin={{ top: 10, right: 16, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)} Jt`} />
                <Tooltip
                  formatter={(val, name) =>
                    Array.isArray(val)
                      ? [`${formatRupiah(val[0])} - ${formatRupiah(val[1])}`, name]
                      : [formatRupiah(val), name]
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="nilai_buku_band"
                  name="Toleransi Nilai Buku ±10%"
                  fill="#1677ff"
                  fillOpacity={0.14}
                  stroke="none"
                />
                <Area
                  type="monotone"
                  dataKey="biaya_band"
                  name="Toleransi Biaya Servis ±10%"
                  fill="#fa8c16"
                  fillOpacity={0.14}
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="nilai_buku"
                  name="Proyeksi Nilai Buku BMN"
                  stroke="#1677ff"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="biaya_servis"
                  name="Proyeksi Akumulasi Servis"
                  stroke="#d48806"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 6: Bubble Chart Sebaran Nilai Perolehan vs Biaya Servis (Ukuran = Skor Risiko) */}
        <Col xs={24} lg={12}>
          <Card
            title="Sebaran Nilai Aset vs Total Biaya Servis (Ukuran = Skor Risiko)"
            bordered={false}
            className="whiteBox shadow"
          >
            <ResponsiveContainer width="100%" height={270}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 6 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="nilai_perolehan_jt" name="Nilai Aset" unit=" Jt" />
                <YAxis type="number" dataKey="biaya_jt" name="Biaya Servis" unit=" Jt" />
                <ZAxis type="number" dataKey="risiko" range={[70, 520]} name="Skor Risiko" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.nama_perangkat} ({d.kode_bmn})</div>
                        <div>Klaster: <strong>{d.klaster}</strong></div>
                        <div>Nilai Perolehan: Rp {(d.nilai_perolehan_jt * 1000000).toLocaleString('id-ID')}</div>
                        <div>Total Biaya Servis: Rp {(d.biaya_jt * 1000000).toLocaleString('id-ID')}</div>
                        <div>Skor Risiko: <strong>{d.risiko}%</strong></div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Scatter name="Normal" data={bubbleNormal} fill="#52c41a" fillOpacity={0.8} />
                <Scatter name="Waspada" data={bubbleWaspada} fill="#faad14" fillOpacity={0.85} />
                <Scatter name="Anomali / Indikasi Fraud" data={bubbleAnomali} fill="#cf1322" fillOpacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
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
          dataSource={summary.earlyWarningRows}
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
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
          <strong style={{ color: '#0f172a' }}>Keterangan Level Alert:</strong>
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
    </div>
  );
}
