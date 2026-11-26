import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Statistic, Table, Tag, Space, message, Divider } from 'antd';
import { PlayCircleOutlined, RadarChartOutlined, SyncOutlined } from '@ant-design/icons';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ReferenceDot,
  BarChart,
  Bar,
} from 'recharts';
import { request } from '@/request';

const clusterColor = {
  Normal: '#389e0d',
  Waspada: '#d48806',
  'Anomali / Indikasi Fraud': '#cf1322',
};

// Fallback preview data sebelum backend ML Engine dijalankan
const PREVIEW_RESULT = {
  nilai_k: 3,
  sse_score: 12.48,
  silhouette_score: 0.684,
  elbow: [
    { k: 1, sse: 48.2 },
    { k: 2, sse: 23.6 },
    { k: 3, sse: 12.48 },
    { k: 4, sse: 9.8 },
    { k: 5, sse: 8.1 },
    { k: 6, sse: 6.9 },
    { k: 7, sse: 5.8 },
    { k: 8, sse: 5.1 },
  ],
  centroids: [
    {
      klaster: 'Normal',
      centroid_frekuensi: 0.14,
      centroid_biaya_servis: 0.15,
      centroid_durasi_pinjam: 0.08,
    },
    {
      klaster: 'Waspada',
      centroid_frekuensi: 0.51,
      centroid_biaya_servis: 0.48,
      centroid_durasi_pinjam: 0.36,
    },
    {
      klaster: 'Anomali / Indikasi Fraud',
      centroid_frekuensi: 0.88,
      centroid_biaya_servis: 0.89,
      centroid_durasi_pinjam: 0.81,
    },
  ],
  items: [
    { id: 1, kode_bmn: '3100102001', nama_perangkat: 'Server Rack Dell PowerEdge R740', x1: 0.12, x2: 0.18, x3: 0.05, jarak: 0.09, klaster: 'Normal', risiko: 14 },
    { id: 2, kode_bmn: '3100102008', nama_perangkat: 'Switch HP Aruba 2930F', x1: 0.16, x2: 0.12, x3: 0.11, jarak: 0.05, klaster: 'Normal', risiko: 11 },
    { id: 3, kode_bmn: '3100102014', nama_perangkat: 'Switch Core Cisco Catalyst 9300', x1: 0.48, x2: 0.52, x3: 0.35, jarak: 0.21, klaster: 'Waspada', risiko: 52 },
    { id: 4, kode_bmn: '3100102019', nama_perangkat: 'Firewall Fortigate 100F', x1: 0.54, x2: 0.44, x3: 0.38, jarak: 0.18, klaster: 'Waspada', risiko: 56 },
    { id: 5, kode_bmn: '3100102029', nama_perangkat: 'Router Mikrotik CCR1036', x1: 0.91, x2: 0.88, x3: 0.82, jarak: 0.14, klaster: 'Anomali / Indikasi Fraud', risiko: 92 },
    { id: 6, kode_bmn: '3100102042', nama_perangkat: 'Laptop Operasional ThinkPad X1', x1: 0.85, x2: 0.94, x3: 0.76, jarak: 0.19, klaster: 'Anomali / Indikasi Fraud', risiko: 89 },
  ],
};

export default function KMeansAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState(PREVIEW_RESULT);

  const loadLatest = async () => {
    setLoading(true);
    try {
      const res = await request.get({ entity: 'kmeans/latest' });
      if (res?.success && res?.result?.items) {
        setData({ ...PREVIEW_RESULT, ...res.result });
      }
    } catch {
      // Tetap gunakan preview data jika endpoint backend belum diaktifkan
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const handleRunKMeans = async () => {
    setRunning(true);
    try {
      const res = await request.post({ entity: 'kmeans/run', jsonData: { k: 3 } });
      if (res?.success && res?.result) {
        setData({ ...PREVIEW_RESULT, ...res.result });
        message.success('Eksekusi K-Means Clustering (K=3) berhasil!');
      } else {
        message.info('Menampilkan simulasi K-Means (backend ML Engine siap dihubungkan).');
      }
    } catch {
      message.info('Menampilkan simulasi K-Means (backend ML Engine belum aktif).');
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    { title: 'Kode BMN', dataIndex: 'kode_bmn', key: 'kode_bmn' },
    { title: 'Nama Perangkat', dataIndex: 'nama_perangkat', key: 'nama_perangkat' },
    { title: 'X1 (Frek. Servis)', dataIndex: 'x1', key: 'x1', render: (v) => Number(v).toFixed(2) },
    { title: 'X2 (Rasio Biaya)', dataIndex: 'x2', key: 'x2', render: (v) => Number(v).toFixed(2) },
    { title: 'X3 (Durasi Pinjam)', dataIndex: 'x3', key: 'x3', render: (v) => Number(v).toFixed(2) },
    { title: 'Jarak Euclidean', dataIndex: 'jarak', key: 'jarak', render: (v) => Number(v).toFixed(3) },
    {
      title: 'Klaster',
      dataIndex: 'klaster',
      key: 'klaster',
      render: (k) => <Tag color={clusterColor[k] || '#595959'}>{k}</Tag>,
    },
    {
      title: 'Risiko Fraud',
      dataIndex: 'risiko',
      key: 'risiko',
      render: (r) => <strong>{r}%</strong>,
    },
  ];

  const normalItems = data.items.filter((i) => i.klaster === 'Normal');
  const waspadaItems = data.items.filter((i) => i.klaster === 'Waspada');
  const anomaliItems = data.items.filter((i) => i.klaster.includes('Anomali'));

  const centroidsList = data.centroids || PREVIEW_RESULT.centroids;
  const centroidNormal = centroidsList.find((c) => c.klaster === 'Normal') || PREVIEW_RESULT.centroids[0];
  const centroidWaspada = centroidsList.find((c) => c.klaster === 'Waspada') || PREVIEW_RESULT.centroids[1];
  const centroidAnomali = centroidsList.find((c) => c.klaster.includes('Anomali')) || PREVIEW_RESULT.centroids[2];

  const centroidPoints = centroidsList.map((c) => ({
    kode_bmn: `Centroid (${c.klaster})`,
    x1: c.centroid_frekuensi,
    x2: c.centroid_biaya_servis,
    x3: c.centroid_durasi_pinjam,
  }));

  // Data untuk Grafik 3: Grouped Bar Chart Profil Centroid Akhir (X1, X2, X3)
  const centroidBarData = [
    {
      fitur: 'X1 (Frekuensi Servis)',
      normal: centroidNormal.centroid_frekuensi,
      waspada: centroidWaspada.centroid_frekuensi,
      anomali: centroidAnomali.centroid_frekuensi,
    },
    {
      fitur: 'X2 (Rasio Biaya Servis)',
      normal: centroidNormal.centroid_biaya_servis,
      waspada: centroidWaspada.centroid_biaya_servis,
      anomali: centroidAnomali.centroid_biaya_servis,
    },
    {
      fitur: 'X3 (Durasi Pinjam)',
      normal: centroidNormal.centroid_durasi_pinjam,
      waspada: centroidWaspada.centroid_durasi_pinjam,
      anomali: centroidAnomali.centroid_durasi_pinjam,
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>
            <RadarChartOutlined /> Engine Analitik K-Means Clustering (K = {data.nilai_k})
          </h2>
          <span style={{ color: '#888' }}>
            Normalisasi Min-Max [0, 1] - Fitur [X1 Frekuensi Servis, X2 Rasio Biaya, X3 Durasi Sirkulasi]
          </span>
        </Col>
        <Col>
          <Space>
            <Button icon={<SyncOutlined />} onClick={loadLatest} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunKMeans} loading={running}>
              Jalankan K-Means (K=3)
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Jumlah Klaster (K)" value={data.nilai_k} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Silhouette Coefficient" value={data.silhouette_score} precision={3} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Elbow SSE / WCSS" value={data.sse_score} precision={2} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic title="Aset Terindikasi Anomali" value={anomaliItems.length} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      {/* Grid 2x2 Grafik K-Means */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Grafik 1: Scatter Plot X1 vs X2 */}
        <Col xs={24} lg={12}>
          <Card title="Scatter Plot K-Means: X1 (Frekuensi) vs X2 (Rasio Biaya)" bordered={false} className="whiteBox shadow">
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x1" name="X1 (Frekuensi)" domain={[0, 1]} />
                <YAxis type="number" dataKey="x2" name="X2 (Rasio Biaya)" domain={[0, 1]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Normal" data={normalItems} fill="#52c41a" />
                <Scatter name="Waspada" data={waspadaItems} fill="#faad14" />
                <Scatter name="Anomali / Fraud" data={anomaliItems} fill="#ff4d4f" />
                <Scatter name="Centroid Akhir" data={centroidPoints} fill="#1d39c4" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 2: Kurva Elbow SSE/WCSS */}
        <Col xs={24} lg={12}>
          <Card title="Kurva Elbow Method (SSE / WCSS untuk K = 1..8)" bordered={false} className="whiteBox shadow">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.elbow || []} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="k" tickFormatter={(v) => `K=${v}`} />
                <YAxis />
                <Tooltip formatter={(v) => [v, 'SSE / WCSS']} labelFormatter={(k) => `Jumlah Klaster K=${k}`} />
                <Line type="monotone" dataKey="sse" stroke="#1677ff" strokeWidth={2.5} dot={{ r: 4 }} />
                <ReferenceDot x={3} y={data.sse_score} r={7} fill="#ff4d4f" stroke="#fff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 3: Grouped Bar Chart Profil Centroid Akhir 3 Klaster (X1, X2, X3) */}
        <Col xs={24} lg={12}>
          <Card title="Profil Centroid Akhir 3 Klaster (X1, X2, X3) - Skala [0, 1]" bordered={false} className="whiteBox shadow">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={centroidBarData} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fitur" />
                <YAxis domain={[0, 1]} />
                <Tooltip formatter={(v) => Number(v).toFixed(2)} />
                <Legend />
                <Bar dataKey="normal" name="Klaster Normal" fill="#52c41a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="waspada" name="Klaster Waspada" fill="#faad14" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anomali" name="Anomali / Indikasi Fraud" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 4: Scatter Plot K-Means Kedua: X2 vs X3 */}
        <Col xs={24} lg={12}>
          <Card title="Scatter Plot K-Means: X2 (Rasio Biaya) vs X3 (Durasi Sirkulasi)" bordered={false} className="whiteBox shadow">
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x2" name="X2 (Rasio Biaya)" domain={[0, 1]} />
                <YAxis type="number" dataKey="x3" name="X3 (Durasi Sirkulasi)" domain={[0, 1]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Normal" data={normalItems} fill="#52c41a" />
                <Scatter name="Waspada" data={waspadaItems} fill="#faad14" />
                <Scatter name="Anomali / Fraud" data={anomaliItems} fill="#ff4d4f" />
                <Scatter name="Centroid Akhir" data={centroidPoints} fill="#1d39c4" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Card title="Hasil Klasterisasi Aset TIK" bordered={false} className="whiteBox shadow">
        <Table rowKey="id" columns={columns} dataSource={data.items} loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
