import { useEffect, useState } from 'react';
import { Button, Card, Col, Collapse, Row, Statistic, Table, Tabs, Tag, Space, message, Divider } from 'antd';
import { PlayCircleOutlined, RadarChartOutlined, SyncOutlined, BulbOutlined, DatabaseOutlined, DesktopOutlined } from '@ant-design/icons';
import TrainingModelTab from './TrainingModelTab';
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
  Cell,
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
  const [interpretOpen, setInterpretOpen] = useState(false);
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

  const handleRunKMeans = async (retrain = false) => {
    setRunning(true);
    try {
      const res = await request.post({ entity: 'kmeans/run', jsonData: { k: 3, retrain } });
      if (res?.success && res?.result) {
        setData({ ...PREVIEW_RESULT, ...res.result });
        message.success(
          retrain
            ? `Model berhasil dilatih ulang pada ${(res.result.training_count || 10000).toLocaleString('id-ID')} data latih & mendeteksi ${res.result.items?.length || 0} aset operasional!`
            : `Deteksi K-Means (K=3) pada ${res.result.items?.length || 0} aset operasional berhasil!`
        );
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

  const silVal = Number(data.silhouette_score || 0);
  const silDesc =
    silVal >= 0.5
      ? 'pemisahan antara aset normal, waspada, dan anomali sudah sangat tegas.'
      : silVal >= 0.25
        ? 'pemisahan kelompok sudah cukup baik sehingga aset bermasalah dapat dibedakan jelas dari aset normal.'
        : 'jarak antar kelompok masih berdekatan karena jumlah/variasi data masih terbatas.';

  const formatRupiah = (val) => `Rp ${Math.round(Number(val || 0)).toLocaleString('id-ID')}`;

  const describeAnomaliReason = (item) => {
    const dom = item.dominant_feature || 'X2';
    const frek = item.frekuensi_servis ?? Math.round(Number(item.x1 || 0) * 3);
    const biaya = formatRupiah(item.total_biaya_rp || 0);
    const buku = formatRupiah(item.nilai_buku_rp || 0);
    const rasio = item.rasio_persen !== undefined ? `${item.rasio_persen}%` : `${Math.round(Number(item.x2 || 0) * 100)}%`;
    const durasi = item.durasi_hari ?? Math.round(Number(item.x3 || 0) * 60);
    const c1 = item.contrib_x1 ?? 0;
    const c2 = item.contrib_x2 ?? 0;
    const c3 = item.contrib_x3 ?? 0;

    if (dom === 'X2') {
      return `pemicu dominan adalah Rasio Biaya Servis (kontribusi ${c2}% dari jarak ke Centroid Normal) sebesar ${biaya} atau ${rasio} terhadap nilai buku (${buku}), disertai ${frek}x servis dan ${durasi} hari durasi pinjam.`;
    }
    if (dom === 'X1') {
      return `pemicu dominan adalah Frekuensi Servis berulang sebanyak ${frek}x (kontribusi ${c1}% dari jarak ke Centroid Normal) dengan total biaya ${biaya} (${rasio} dari nilai buku ${buku}) dan ${durasi} hari durasi pinjam.`;
    }
    return `pemicu dominan adalah Durasi Sirkulasi/Pinjam selama ${durasi} hari (kontribusi ${c3}% dari jarak ke Centroid Normal), disertai ${frek}x servis senilai ${biaya} (${rasio} dari nilai buku ${buku}).`;
  };

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

  const riskRankingData = [...data.items]
    .sort((a, b) => Number(b.risiko || 0) - Number(a.risiko || 0))
    .slice(0, 15)
    .map((item) => ({
      nama: item.nama_perangkat?.length > 22 ? `${item.nama_perangkat.slice(0, 22)}...` : item.nama_perangkat,
      fullNama: `${item.nama_perangkat} (${item.kode_bmn})`,
      risiko: Number(item.risiko || 0),
      klaster: item.klaster,
      fill: clusterColor[item.klaster] || '#595959',
    }));

  const contribChartData = [...data.items]
    .filter((i) => i.klaster !== 'Normal' || Number(i.contrib_x1 || 0) + Number(i.contrib_x2 || 0) + Number(i.contrib_x3 || 0) > 0)
    .sort((a, b) => Number(b.risiko || 0) - Number(a.risiko || 0))
    .slice(0, 7)
    .map((item) => ({
      nama: item.kode_bmn,
      fullNama: item.nama_perangkat,
      X1: Number(item.contrib_x1 || 0),
      X2: Number(item.contrib_x2 || 0),
      X3: Number(item.contrib_x3 || 0),
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
          <Space wrap>
            <Button icon={<SyncOutlined />} onClick={loadLatest} loading={loading}>
              Refresh
            </Button>
            <Button onClick={() => handleRunKMeans(true)} loading={running}>
              Latih Ulang Model (10k Data)
            </Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleRunKMeans(false)} loading={running}>
              Deteksi Aset Riil (K=3)
            </Button>
          </Space>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="realtime"
        size="large"
        items={[
          {
            key: 'realtime',
            label: (
              <span>
                <DesktopOutlined /> Deteksi Aset Operasional Real-Time ({data.items.length} Unit BMN)
              </span>
            ),
            children: (
              <>
      <Card bordered={false} className="whiteBox shadow" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px', color: '#475569', fontSize: 13.5 }}>
        <strong style={{ color: '#0f172a' }}>Tentang Tab Ini:</strong> Modul ini menganalisis{' '}
        <strong>{data.items.length} unit BMN operasional</strong> yang tersimpan di database secara langsung menggunakan model K-Means terlatih. Setiap perangkat dikelompokkan otomatis ke klaster <strong>Normal</strong>, <strong>Waspada</strong>, atau <strong>Anomali / Indikasi Fraud</strong> berdasarkan frekuensi servis, rasio biaya perbaikan terhadap nilai buku, dan durasi peminjamannya.
      </Card>
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

      {/* Ringkasan Interpretasi Hasil Analisis (tertutup default, klik untuk buka) */}
      <Card bordered={false} className="whiteBox shadow" style={{ marginTop: 16 }} bodyStyle={{ padding: '4px 16px' }}>
        <Collapse
          ghost
          activeKey={interpretOpen ? ['interpretasi'] : []}
          onChange={(keys) => setInterpretOpen(Array.isArray(keys) ? keys.includes('interpretasi') : Boolean(keys))}
          items={[
            {
              key: 'interpretasi',
              label: (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    <BulbOutlined style={{ color: '#d48806', marginRight: 8 }} />
                    Interpretasi Hasil Analisis
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: '#64748b',
                      marginLeft: 23,
                      marginTop: interpretOpen ? 0 : 2,
                      maxHeight: interpretOpen ? 0 : 24,
                      opacity: interpretOpen ? 0 : 1,
                      overflow: 'hidden',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    Klik untuk menampilkan ringkasan klaster, pemicu anomali per perangkat, dan rekomendasi audit
                  </div>
                </div>
              ),
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6, fontSize: 14 }}>
                      <span>
                        Dari <strong>{data.items.length} perangkat TIK</strong> yang dianalisis:
                      </span>
                      <Tag color="#389e0d" style={{ margin: 0 }}>{normalItems.length} Normal</Tag>
                      <Tag color="#d48806" style={{ margin: 0 }}>{waspadaItems.length} Waspada</Tag>
                      <Tag color="#cf1322" style={{ margin: 0 }}>{anomaliItems.length} Anomali / Perlu Audit</Tag>
                    </div>
                    <div style={{ color: '#475569', fontSize: 13 }}>
                      {`Tingkat keakuratan pengelompokan (Silhouette ${silVal.toFixed(3)}) menunjukkan bahwa ${silDesc} Pembagian 3 kelompok dipilih karena pada grafik Elbow (SSE ${Number(data.sse_score || 0).toFixed(2)}) titik K=3 merupakan batas sebelum penurunan kurva melandai.`}
                    </div>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={[16, 12]}>
                    <Col xs={24} lg={14}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Alasan Perangkat Terindikasi Anomali:</div>
                      {anomaliItems.length > 0 ? (
                        <>
                          <ul style={{ margin: 0, paddingLeft: 18, color: '#334155', lineHeight: 1.7 }}>
                            {anomaliItems.slice(0, 10).map((item) => (
                              <li key={item.kode_bmn || item.id} style={{ marginBottom: 6 }}>
                                <Tag color="#0958d9" style={{ fontWeight: 600, marginRight: 6 }}>
                                  {item.nama_perangkat} ({item.kode_bmn})
                                </Tag>
                                memiliki skor risiko <strong style={{ color: '#cf1322' }}>{item.risiko}%</strong> karena{' '}
                                {describeAnomaliReason(item)}
                              </li>
                            ))}
                          </ul>
                          {anomaliItems.length > 10 && (
                            <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>
                              Menampilkan 10 dari {anomaliItems.length} perangkat anomali teratas. Lihat tabel detail di bawah untuk daftar lengkap.
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#389e0d' }}>Semua perangkat berada dalam kondisi pemakaian dan biaya pemeliharaan yang wajar.</span>
                      )}
                    </Col>
                    <Col xs={24} lg={10} style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Rekomendasi Tindak Lanjut Audit:</div>
                      <ul style={{ margin: 0, paddingLeft: 18, color: '#334155', lineHeight: 1.7 }}>
                        <li>Cek ulang nota biaya dan SPK vendor pada menu <strong>Pemeliharaan &amp; QC</strong> untuk unit berlabel merah.</li>
                        <li>Pastikan status pengembalian unit pada menu <strong>Sirkulasi &amp; BAST</strong> jika durasi pinjam terlalu lama.</li>
                        <li>Catat hasil pemeriksaan resmi pada menu <strong>Early Warning</strong> sebagai bahan laporan Kabid TIK.</li>
                      </ul>
                    </Col>
                  </Row>
                </>
              ),
            },
          ]}
        />
      </Card>

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
                <Scatter name="Normal" data={normalItems.slice(0, 120)} fill="#52c41a" />
                <Scatter name="Waspada" data={waspadaItems.slice(0, 120)} fill="#faad14" />
                <Scatter name="Anomali / Fraud" data={anomaliItems.slice(0, 120)} fill="#ff4d4f" />
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
                <Scatter name="Normal" data={normalItems.slice(0, 120)} fill="#52c41a" />
                <Scatter name="Waspada" data={waspadaItems.slice(0, 120)} fill="#faad14" />
                <Scatter name="Anomali / Fraud" data={anomaliItems.slice(0, 120)} fill="#ff4d4f" />
                <Scatter name="Centroid Akhir" data={centroidPoints} fill="#1d39c4" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 5: Stacked Bar Chart Kontribusi Pemicu Risiko (X1, X2, X3 %) */}
        <Col xs={24} lg={12}>
          <Card title="Kontribusi Pemicu Risiko per Perangkat (X1, X2, X3 %)" bordered={false} className="whiteBox shadow">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={contribChartData} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nama" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v, name) => [`${v}%`, name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullNama || ''}
                />
                <Legend />
                <Bar dataKey="X1" name="X1 (Frek. Servis)" stackId="a" fill="#0958d9" />
                <Bar dataKey="X2" name="X2 (Rasio Biaya)" stackId="a" fill="#cf1322" />
                <Bar dataKey="X3" name="X3 (Durasi Pinjam)" stackId="a" fill="#d48806" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Grafik 6: Horizontal Bar Chart Peringkat Skor Risiko Fraud (%) */}
        <Col xs={24} lg={12}>
          <Card title="Peringkat Skor Risiko Fraud (%) per Perangkat" bordered={false} className="whiteBox shadow">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={riskRankingData} layout="vertical" margin={{ top: 5, right: 24, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="nama" width={150} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Skor Risiko']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullNama || ''}
                />
                <Bar dataKey="risiko" name="Skor Risiko (%)" radius={[0, 4, 4, 0]}>
                  {riskRankingData.map((entry, idx) => (
                    <Cell key={`risk-cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Card title="Hasil Klasterisasi Aset TIK" bordered={false} className="whiteBox shadow">
        <Table rowKey="id" columns={columns} dataSource={data.items} loading={loading} pagination={{ pageSize: 10 }} />
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 12.5,
            color: '#475569',
          }}
        >
          <strong style={{ color: '#0f172a' }}>Keterangan Rentang Nilai Normalisasi Min-Max [0.00 - 1.00] (X1, X2, X3):</strong>
          <div>
            <Tag color="#389e0d" style={{ marginRight: 8, fontWeight: 600 }}>0.00 - 0.33 (Rendah)</Tag>
            Aktivitas pemeliharaan dan peminjaman masih rendah/normal dibanding perangkat lain.
          </div>
          <div>
            <Tag color="#d48806" style={{ marginRight: 8, fontWeight: 600 }}>0.34 - 0.66 (Menengah)</Tag>
            Mulai terlihat kenaikan frekuensi servis, rasio biaya, atau durasi pinjam; perlu pemantauan.
          </div>
          <div>
            <Tag color="#cf1322" style={{ marginRight: 8, fontWeight: 600 }}>0.67 - 1.00 (Tinggi / Ekstrem)</Tag>
            Mendekati nilai tertinggi di populasi (sering rusak berulang, biaya servis besar vs nilai buku, atau durasi pinjam lama).
          </div>
          <div style={{ marginTop: 4, color: '#64748b' }}>
            <strong>X1</strong> = Frekuensi Servis | <strong>X2</strong> = Rasio Biaya Servis terhadap Nilai Buku | <strong>X3</strong> = Durasi Sirkulasi/Pinjam | <strong>Jarak Euclidean</strong> = Jarak aset terhadap pusat (centroid) klasternya.
          </div>
        </div>
      </Card>
              </>
            ),
          },
          {
            key: 'training',
            label: (
              <span>
                <DatabaseOutlined /> Visualisasi Model Pelatihan ({(data.training_count || 10000).toLocaleString('id-ID')} Data Baseline)
              </span>
            ),
            children: (
              <>
                <Card bordered={false} className="whiteBox shadow" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px', color: '#475569', fontSize: 13.5 }}>
                  <strong style={{ color: '#0f172a' }}>Tentang Tab Ini:</strong> Modul ini menampilkan{' '}
                  <strong>{(data.training_count || 10000).toLocaleString('id-ID')} data latih dasar</strong> yang digunakan untuk melatih model K-Means agar sistem memiliki patokan skala normalisasi dan titik pusat klaster yang konsisten sebelum mendeteksi aset operasional di database.
                </Card>
                <TrainingModelTab modelMeta={data} />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
