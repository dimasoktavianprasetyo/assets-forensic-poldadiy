import { useEffect, useState } from 'react';
import { Card, Col, Row, Select, Spin, Statistic, Table, Tag, Tooltip as AntTooltip } from 'antd';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts';
import { request } from '@/request';

// Gradasi warna spektrum kontinyu (Hijau -> Lime -> Kuning -> Oranye -> Merah Tua) sesuai skor risiko [0..100]
function riskToSpectrumColor(risk) {
  const r = Math.max(0, Math.min(100, Number(risk || 0)));
  if (r < 18) return '#15803d';
  if (r < 30) return '#4ade80';
  if (r < 42) return '#bef264';
  if (r < 54) return '#fde047';
  if (r < 66) return '#fb923c';
  if (r < 80) return '#ef4444';
  return '#991b1b';
}

// Skala warna sel Heatmap (Biru/Hijau tenang -> Kuning -> Merah intens) berdasarkan kepadatan & risiko
function heatmapCellColor(count, avgRisk) {
  if (!count) return { bg: '#f8fafc', text: '#cbd5e1', border: '#e2e8f0' };
  if (avgRisk < 22) {
    const alpha = Math.min(0.88, 0.18 + Math.log10(count + 1) * 0.22);
    return { bg: `rgba(22, 163, 74, ${alpha.toFixed(2)})`, text: alpha > 0.55 ? '#ffffff' : '#14532d', border: '#bbf7d0' };
  }
  if (avgRisk < 52) {
    const alpha = Math.min(0.9, 0.22 + Math.log10(count + 1) * 0.24);
    return { bg: `rgba(234, 179, 8, ${alpha.toFixed(2)})`, text: '#422006', border: '#fef08a' };
  }
  const alpha = Math.min(0.92, 0.28 + Math.log10(count + 1) * 0.25);
  return { bg: `rgba(220, 38, 38, ${alpha.toFixed(2)})`, text: alpha > 0.45 ? '#ffffff' : '#7f1d1d', border: '#fecaca' };
}

const clusterColor = {
  Normal: '#16a34a',
  Waspada: '#d97706',
  'Anomali / Indikasi Fraud': '#dc2626',
};

export default function TrainingModelTab({ modelMeta }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [filterKlaster, setFilterKlaster] = useState('ALL');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    request
      .get({ entity: 'kmeans/training-analytics' })
      .then((res) => {
        if (mounted && res?.success && res?.result) {
          setAnalytics(res.result);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [modelMeta?.id_analisis]);

  if (loading && !analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" tip="Memuat visualisasi 10.000 data pelatihan model..." />
      </div>
    );
  }

  if (!analytics || !analytics.total_count) {
    return (
      <Card bordered={false} className="whiteBox shadow">
        Dataset pelatihan (`dataset_latih_kmeans`) belum tersedia. Klik <strong>Latih Ulang Model (10k Data)</strong> di atas.
      </Card>
    );
  }

  const scatterData = analytics.scatter_cloud || [];
  const histX2 = analytics.hist_x2 || [];
  const histX3 = analytics.hist_x3 || [];
  const heatmap = analytics.heatmap || { bands: [], rows: [] };
  const clevelandDots = analytics.cleveland_dots || [];
  const sampleRows = (analytics.sample_rows || []).filter(
    (r) => filterKlaster === 'ALL' || r.label_referensi === filterKlaster
  );

  const groupedDots = [
    { group: 'Kelompok Normal', color: '#16a34a', items: clevelandDots.filter((d) => d.klaster === 'Normal') },
    { group: 'Kelompok Waspada', color: '#d97706', items: clevelandDots.filter((d) => d.klaster === 'Waspada') },
    { group: 'Kelompok Anomali / Fraud', color: '#dc2626', items: clevelandDots.filter((d) => d.klaster.includes('Anomali')) },
  ];

  const tableColumns = [
    { title: 'Kode Sampel', dataIndex: 'kode_sampel', key: 'kode_sampel', width: 135 },
    { title: 'Skenario', dataIndex: 'kode_skenario', key: 'kode_skenario', width: 85, render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Kategori Perangkat', dataIndex: 'kategori_perangkat', key: 'kategori_perangkat' },
    { title: 'X1 (Servis)', dataIndex: 'frekuensi_servis', key: 'x1', render: (v) => `${v}x` },
    {
      title: 'X2 (Rasio Biaya/Buku)',
      dataIndex: 'rasio_biaya_buku',
      key: 'x2',
      render: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    },
    { title: 'X3 (Durasi)', dataIndex: 'durasi_sirkulasi_hari', key: 'x3', render: (v) => `${v} hari` },
    { title: 'Status QC', dataIndex: 'status_qc_dominan', key: 'qc' },
    {
      title: 'Label Pola Latih',
      dataIndex: 'label_referensi',
      key: 'lbl',
      render: (k) => <Tag color={clusterColor[k] || '#595959'}>{k}</Tag>,
    },
  ];

  return (
    <div>
      {/* KPI Ringkasan Populasi Data Latih 10.000 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic
              title="Total Populasi Data Latih"
              value={analytics.total_count}
              suffix="Baris"
              valueStyle={{ color: '#1d4ed8' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic
              title="Pola Latih Normal (N1-N3)"
              value={analytics.class_counts?.Normal || 0}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic
              title="Pola Latih Waspada (W1-W2)"
              value={analytics.class_counts?.Waspada || 0}
              valueStyle={{ color: '#d97706' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="whiteBox shadow">
            <Statistic
              title="Pola Latih Fraud (F1-F3)"
              value={analytics.class_counts?.['Anomali / Indikasi Fraud'] || 0}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
      </Row>

      {/* PANEL 1: Dense Color-Gradient Scatter Cloud + Colorbar + Dual Histograms */}
      <Card
        title="Sebaran Spektrum Risiko Data Latih: X2 (Rasio Biaya Servis) vs X3 (Durasi Sirkulasi) & Distribusi Histogram"
        bordered={false}
        className="whiteBox shadow"
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 560px', minWidth: 300, background: '#f8fafc', borderRadius: 8, padding: '12px 8px 4px 0', border: '1px solid #e2e8f0' }}>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis
                  type="number"
                  dataKey="x2"
                  name="Rasio Biaya Servis (X2)"
                  domain={[0, 'auto']}
                  label={{ value: 'X2: Rasio Biaya Servis terhadap Nilai Buku (x lipat)', position: 'insideBottom', offset: -8, fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="x3"
                  name="Durasi Sirkulasi (X3)"
                  domain={[0, 'auto']}
                  label={{ value: 'X3: Durasi Sirkulasi (Hari)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.kode_sampel} ({p.skenario})</div>
                        <div>Klaster: <strong>{p.klaster}</strong></div>
                        <div>X1 Frekuensi: <strong>{p.x1}x</strong> | X2 Rasio: <strong>{(p.x2 * 100).toFixed(1)}%</strong></div>
                        <div>X3 Durasi: <strong>{p.x3} hari</strong> | Skor Risiko: <strong>{p.risiko}%</strong></div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Sampel Data Latih" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`sc-${index}`} fill={riskToSpectrumColor(entry.risiko)} fillOpacity={0.85} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Vertical Continuous Colorbar Legend (seperti matplotlib / seaborn colorbar) */}
          <div style={{ width: 115, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 6, textAlign: 'center' }}>
              Skor Risiko
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', height: 245, gap: 8 }}>
              <div
                style={{
                  width: 20,
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  background: 'linear-gradient(to bottom, #991b1b 0%, #ef4444 20%, #fb923c 38%, #fde047 55%, #bef264 72%, #4ade80 86%, #15803d 100%)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                <span>99% (Fraud)</span>
                <span>75%</span>
                <span>50% (Waspada)</span>
                <span>25%</span>
                <span>5% (Normal)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dua Histogram di Bawah Scatter Plot */}
        <Row gutter={[16, 16]} style={{ marginTop: 18 }}>
          <Col xs={24} lg={12}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 12px 4px' }}>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>
                Histogram Distribusi Fitur X2 (Rasio Biaya Servis vs Nilai Buku)
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={histX2} barCategoryGap={1} margin={{ top: 6, right: 12, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Normal" stackId="h2" fill="#16a34a" />
                  <Bar dataKey="Waspada" stackId="h2" fill="#f59e0b" />
                  <Bar dataKey="Anomali" name="Anomali / Fraud" stackId="h2" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>

          <Col xs={24} lg={12}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 12px 4px' }}>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>
                Histogram Distribusi Fitur X3 (Durasi Sirkulasi / Peminjaman Hari)
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={histX3} barCategoryGap={1} margin={{ top: 6, right: 12, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Normal" stackId="h3" fill="#16a34a" />
                  <Bar dataKey="Waspada" stackId="h3" fill="#f59e0b" />
                  <Bar dataKey="Anomali" name="Anomali / Fraud" stackId="h3" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>
        </Row>
      </Card>

      {/* PANEL 2: 2D Heatmap Matrix & Cleveland Dot Plot */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* 2D Matrix Heatmap */}
        <Col xs={24} lg={13}>
          <Card
            title="Matriks Intensitas Populasi Data Latih (Frekuensi Servis X1 × Rentang Rasio Biaya X2)"
            bordered={false}
            className="whiteBox shadow"
            style={{ height: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Tiap kotak menunjukkan jumlah sampel dari 10.000 data latih dan zona warna risikonya.
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <span style={{ marginRight: 4, color: '#475569' }}>Zona:</span>
                <span style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 3 }}>Normal</span>
                <span style={{ background: '#eab308', color: '#422006', padding: '2px 8px', borderRadius: 3 }}>Waspada</span>
                <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 3 }}>Anomali</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, fontSize: 11.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#475569', minWidth: 82 }}>X1 \ X2</th>
                    {heatmap.bands.map((b) => (
                      <th key={b} style={{ textAlign: 'center', padding: '6px 4px', color: '#334155', fontWeight: 600, minWidth: 54 }}>
                        {b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.rows.map((row) => (
                    <tr key={row.rowLabel}>
                      <td style={{ fontWeight: 600, color: '#1e293b', padding: '6px 8px', whiteSpace: 'nowrap', background: '#f1f5f9', borderRadius: 4 }}>
                        {row.rowLabel}
                      </td>
                      {row.cells.map((cell) => {
                        const styleObj = heatmapCellColor(cell.count, cell.avgRisk);
                        return (
                          <AntTooltip
                            key={cell.band}
                            title={`${row.rowLabel} & Rasio ${cell.band}: ${cell.count} sampel (Rata-rata Risiko: ${cell.avgRisk}%)`}
                          >
                            <td
                              style={{
                                background: styleObj.bg,
                                color: styleObj.text,
                                border: `1px solid ${styleObj.border}`,
                                borderRadius: 4,
                                textAlign: 'center',
                                padding: '10px 4px',
                                fontWeight: cell.count > 0 ? 600 : 400,
                                cursor: 'default',
                                transition: 'transform 0.15s',
                              }}
                            >
                              {cell.count > 0 ? cell.count : '·'}
                            </td>
                          </AntTooltip>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Col>

        {/* Cleveland Dot Plot 8 Skenario */}
        <Col xs={24} lg={11}>
          <Card
            title="Cleveland Dot Plot: Profil 8 Skenario Pola Pelatihan (N1-F3)"
            bordered={false}
            className="whiteBox shadow"
            style={{ height: '100%' }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Posisi titik horizontal menunjukkan rata-rata indeks risiko komposit (%) tiap skenario dari 10.000 data.
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 16px 10px', background: '#ffffff' }}>
              {groupedDots.map((grp) => (
                <div key={grp.group} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: grp.color, marginBottom: 4 }}>
                    {grp.group} ({grp.items.reduce((acc, x) => acc + x.count, 0).toLocaleString('id-ID')} data)
                  </div>
                  {grp.items.map((item) => (
                    <div
                      key={item.kode_skenario}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '5px 0',
                      }}
                    >
                      <div
                        style={{
                          width: 195,
                          fontSize: 11.5,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${item.label} (${item.count} data)`}
                      >
                        {item.label}
                      </div>
                      <div style={{ flex: 1, position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '100%', borderBottom: '1.5px dotted #cbd5e1' }} />
                        <AntTooltip
                          title={`${item.label} | ${item.count} sampel | Rata-rata Risiko: ${item.avg_risk}% | X1=${item.avg_x1}x, X2=${item.avg_x2_pct}%, X3=${item.avg_x3} hr`}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: `calc(${Math.min(96, Math.max(2, item.avg_risk))}% - 6px)`,
                              width: 11,
                              height: 11,
                              borderRadius: '50%',
                              background: grp.color,
                              border: '2px solid #fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                              cursor: 'pointer',
                            }}
                          />
                        </AntTooltip>
                      </div>
                      <div style={{ width: 42, textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                        {item.avg_risk}%
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Sumbu X Cleveland Dot Plot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, paddingTop: 6, borderTop: '1px solid #94a3b8' }}>
                <div style={{ width: 195, fontSize: 11, color: '#64748b' }}>Skala Indeks Risiko</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#475569', fontFamily: 'monospace' }}>
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <div style={{ width: 42 }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* PANEL 2B: Peta Jaringan Klaster (Cluster Network Graph) */}
      <Card
        title="Peta Jaringan Klaster & Keterkaitan Pola Fitur (10.000 Data Baseline)"
        bordered={false}
        className="whiteBox shadow"
        style={{ marginBottom: 16 }}
      >
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <style>{`
            @keyframes neuralPulse {
              0% { transform: scale(1); opacity: 0.6; }
              70% { transform: scale(1.48); opacity: 0; }
              100% { transform: scale(1.48); opacity: 0; }
            }
            @keyframes neuralFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-4px); }
            }
            .neural-hub-ring {
              transform-box: fill-box;
              transform-origin: center;
              animation: neuralPulse 2.6s ease-out infinite;
            }
            .neural-node {
              animation: neuralFloat 3.4s ease-in-out infinite;
            }
          `}</style>
          <svg viewBox="0 0 900 365" style={{ width: '100%', maxHeight: 360, display: 'block' }}>
            <defs>
              <filter id="neuralGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Cross-cluster bridge synapses with traveling signals */}
            {[
              { id: 'bridge-1', d: 'M 220 180 Q 340 125 450 135', color: '#f59e0b', dur: '3.2s' },
              { id: 'bridge-2', d: 'M 450 135 Q 570 125 680 185', color: '#ef4444', dur: '2.9s' },
              { id: 'bridge-3', d: 'M 220 180 Q 450 265 680 185', color: '#64748b', dur: '4.5s', dashed: true },
            ].map((b) => (
              <g key={b.id}>
                <path
                  d={b.d}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.3"
                  strokeDasharray={b.dashed ? '4 4' : undefined}
                  strokeOpacity="0.45"
                />
                <circle r="3.2" fill={b.color} filter="url(#neuralGlow)">
                  <animateMotion dur={b.dur} repeatCount="indefinite" path={b.d} />
                </circle>
              </g>
            ))}

            {/* Green Cluster (Normal) Synapses */}
            {[
              [110, 105],
              [160, 75],
              [275, 85],
              [100, 210],
              [155, 275],
              [270, 265],
            ].map(([nx, ny], idx) => {
              const p = `M 220 180 Q ${(220 + nx) / 2} ${(180 + ny) / 2 - 14} ${nx} ${ny}`;
              return (
                <g key={`g-link-${idx}`}>
                  <path d={p} fill="none" stroke="#16a34a" strokeWidth="1.5" strokeOpacity="0.42" />
                  <circle r="2.6" fill="#22c55e" filter="url(#neuralGlow)">
                    <animateMotion dur={`${2.2 + idx * 0.35}s`} begin={`${idx * 0.3}s`} repeatCount="indefinite" path={p} />
                  </circle>
                </g>
              );
            })}

            {/* Yellow/Amber Cluster (Waspada) Synapses */}
            {[
              [370, 62],
              [450, 52],
              [535, 65],
              [360, 225],
              [540, 225],
            ].map(([nx, ny], idx) => {
              const p = `M 450 135 Q ${(450 + nx) / 2} ${(135 + ny) / 2 - 10} ${nx} ${ny}`;
              return (
                <g key={`y-link-${idx}`}>
                  <path d={p} fill="none" stroke="#d97706" strokeWidth="1.5" strokeOpacity="0.45" />
                  <circle r="2.6" fill="#fbbf24" filter="url(#neuralGlow)">
                    <animateMotion dur={`${2.0 + idx * 0.35}s`} begin={`${idx * 0.25}s`} repeatCount="indefinite" path={p} />
                  </circle>
                </g>
              );
            })}

            {/* Red Cluster (Anomali / Fraud) Synapses */}
            {[
              [630, 88],
              [745, 80],
              [800, 150],
              [790, 250],
              [720, 290],
              [620, 268],
            ].map(([nx, ny], idx) => {
              const p = `M 680 185 Q ${(680 + nx) / 2} ${(185 + ny) / 2 - 12} ${nx} ${ny}`;
              return (
                <g key={`r-link-${idx}`}>
                  <path d={p} fill="none" stroke="#dc2626" strokeWidth="1.6" strokeOpacity="0.48" />
                  <circle r="2.8" fill="#f87171" filter="url(#neuralGlow)">
                    <animateMotion dur={`${1.8 + idx * 0.3}s`} begin={`${idx * 0.2}s`} repeatCount="indefinite" path={p} />
                  </circle>
                </g>
              );
            })}

            {/* Green Member Nodes */}
            {[
              { x: 110, y: 105, r: 9, lbl: 'N1: Jarang Servis (0-1x)' },
              { x: 160, y: 75, r: 8, lbl: 'Biaya < 15% Nilai Buku' },
              { x: 275, y: 85, r: 8, lbl: 'N2: Pemakaian Rutin' },
              { x: 100, y: 210, r: 9, lbl: 'Pinjam Singkat (3-24 hr)' },
              { x: 155, y: 275, r: 8, lbl: 'N3: Kondisi Baik (B)' },
              { x: 270, y: 265, r: 7, lbl: 'Risiko 5% - 25%' },
            ].map((n, idx) => (
              <g key={`g-node-${idx}`} className="neural-node" style={{ animationDelay: `${idx * 0.35}s` }}>
                <circle cx={n.x} cy={n.y} r={n.r} fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
                <text x={n.x} y={n.y + n.r + 13} textAnchor="middle" fill="#166534" fontSize="11" fontWeight="600">
                  {n.lbl}
                </text>
              </g>
            ))}

            {/* Yellow Member Nodes */}
            {[
              { x: 370, y: 62, r: 8, lbl: 'W1: Servis 2-4x' },
              { x: 450, y: 52, r: 9, lbl: 'Rasio Biaya 20-50%' },
              { x: 535, y: 65, r: 8, lbl: 'W2: Durasi 30-72 hr' },
              { x: 360, y: 225, r: 7, lbl: 'Perlu Pemantauan' },
              { x: 540, y: 225, r: 7, lbl: 'Risiko 40% - 60%' },
            ].map((n, idx) => (
              <g key={`y-node-${idx}`} className="neural-node" style={{ animationDelay: `${idx * 0.4}s` }}>
                <circle cx={n.x} cy={n.y} r={n.r} fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <text x={n.x} y={n.y - n.r - 6} textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="600">
                  {n.lbl}
                </text>
              </g>
            ))}

            {/* Red Member Nodes */}
            {[
              { x: 630, y: 88, r: 9, lbl: 'F1: Biaya > 1.8x Nilai Buku' },
              { x: 745, y: 80, r: 9, lbl: 'F2: Servis Berulang 5-8x' },
              { x: 800, y: 150, r: 8, lbl: 'Pinjam > 60 Hari' },
              { x: 790, y: 250, r: 9, lbl: 'F3: Anomali Ganda' },
              { x: 720, y: 290, r: 8, lbl: 'Wajib Audit Investigasi' },
              { x: 620, y: 268, r: 8, lbl: 'Risiko 75% - 99%' },
            ].map((n, idx) => (
              <g key={`r-node-${idx}`} className="neural-node" style={{ animationDelay: `${idx * 0.3}s` }}>
                <circle cx={n.x} cy={n.y} r={n.r} fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                <text x={n.x} y={n.y + n.r + 13} textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">
                  {n.lbl}
                </text>
              </g>
            ))}

            {/* 3 Centroid Hub Nodes with Neural Pulse Rings */}
            <g>
              <circle cx={220} cy={180} r={28} fill="none" stroke="#22c55e" strokeWidth="2" className="neural-hub-ring" />
              <circle cx={220} cy={180} r={28} fill="#16a34a" stroke="#ffffff" strokeWidth="2.5" filter="url(#neuralGlow)" />
              <text x={220} y={184} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Normal</text>
              <text x={220} y={224} textAnchor="middle" fill="#14532d" fontSize="11.5" fontWeight="700">
                {(analytics.class_counts?.Normal || 6400).toLocaleString('id-ID')} Data
              </text>
            </g>
            <g>
              <circle cx={450} cy={135} r={29} fill="none" stroke="#f59e0b" strokeWidth="2" className="neural-hub-ring" style={{ animationDelay: '0.8s' }} />
              <circle cx={450} cy={135} r={29} fill="#d97706" stroke="#ffffff" strokeWidth="2.5" filter="url(#neuralGlow)" />
              <text x={450} y={139} textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="700">Waspada</text>
              <text x={450} y={180} textAnchor="middle" fill="#78350f" fontSize="11.5" fontWeight="700">
                {(analytics.class_counts?.Waspada || 2200).toLocaleString('id-ID')} Data
              </text>
            </g>
            <g>
              <circle cx={680} cy={185} r={28} fill="none" stroke="#ef4444" strokeWidth="2" className="neural-hub-ring" style={{ animationDelay: '1.5s' }} />
              <circle cx={680} cy={185} r={28} fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" filter="url(#neuralGlow)" />
              <text x={680} y={189} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Anomali</text>
              <text x={680} y={229} textAnchor="middle" fill="#7f1d1d" fontSize="11.5" fontWeight="700">
                {(analytics.class_counts?.['Anomali / Indikasi Fraud'] || 1400).toLocaleString('id-ID')} Data
              </text>
            </g>
          </svg>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <strong style={{ color: '#0f172a', display: 'block', marginBottom: 4 }}>Menganalisis Klaster:</strong>
          Setiap klaster warna mewakili profil perilaku aset yang spesifik pada 10.000 data latih.{' '}
          <strong style={{ color: '#16a34a' }}>Klaster Hijau (Normal)</strong> menghimpun perangkat dengan servis jarang dan biaya rendah,{' '}
          <strong style={{ color: '#d97706' }}>Klaster Kuning (Waspada)</strong> menandai peningkatan frekuensi servis atau durasi pinjam menengah, sedangkan{' '}
          <strong style={{ color: '#dc2626' }}>Klaster Merah (Anomali / Fraud)</strong> memetakan pola ekstrem seperti biaya perbaikan berlipat dari nilai buku dan keterlambatan sirkulasi berat.
        </div>
      </Card>

      {/* PANEL 3: Tabel Eksplorasi Sampel Data Latih 10.000 */}
      <Card
        title="Sampel Isi Tabel Dataset Latih Terpisah (dataset_latih_kmeans - 10.000 Baris)"
        extra={
          <Select
            value={filterKlaster}
            onChange={setFilterKlaster}
            style={{ width: 220 }}
            options={[
              { value: 'ALL', label: 'Semua Klaster Pola Latih' },
              { value: 'Normal', label: 'Pola Normal (N1-N3)' },
              { value: 'Waspada', label: 'Pola Waspada (W1-W2)' },
              { value: 'Anomali / Indikasi Fraud', label: 'Pola Anomali / Fraud (F1-F3)' },
            ]}
          />
        }
        bordered={false}
        className="whiteBox shadow"
      >
        <Table
          rowKey="kode_sampel"
          columns={tableColumns}
          dataSource={sampleRows}
          pagination={{ pageSize: 8 }}
          size="small"
        />
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
            fontSize: 12.5,
            color: '#475569',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <strong style={{ color: '#0f172a', marginBottom: 2 }}>Keterangan Kode Skenario Data Latih (N1-N3, W1-W2, F1-F3):</strong>
          <div><Tag color="#389e0d" style={{ marginRight: 8, fontWeight: 600 }}>N1</Tag><strong>Normal - Aset Baru / Tanpa Kerusakan:</strong> Belum pernah servis (X1=0), biaya Rp 0, pinjam singkat/tidak ada.</div>
          <div><Tag color="#389e0d" style={{ marginRight: 8, fontWeight: 600 }}>N2</Tag><strong>Normal - Pemeliharaan Preventif &amp; Kalibrasi Rutin:</strong> Servis rutin 1x, biaya wajar (&lt; 18% nilai buku), kembali tepat waktu.</div>
          <div><Tag color="#389e0d" style={{ marginRight: 8, fontWeight: 600 }}>N3</Tag><strong>Normal - Sirkulasi Lapangan Aktif Terkendali:</strong> Dipinjam operasional rutin (8-28 hari) dengan biaya servis rendah (&lt; 20%).</div>
          <div><Tag color="#d48806" style={{ marginRight: 8, fontWeight: 600 }}>W1</Tag><strong>Waspada - Beban Biaya Servis Meningkat:</strong> Penuaan aset dengan rasio biaya servis 65%-175% dari nilai buku.</div>
          <div><Tag color="#d48806" style={{ marginRight: 8, fontWeight: 600 }}>W2</Tag><strong>Waspada - Keterlambatan Pengembalian Mutasi/Pinjam:</strong> Durasi sirkulasi mulai panjang dengan keterlambatan sedang.</div>
          <div><Tag color="#cf1322" style={{ marginRight: 8, fontWeight: 600 }}>F1</Tag><strong>Anomali - Indikasi Mark-up &amp; Split Billing Biaya Servis:</strong> Servis berulang (2-4x) dan rasio biaya ekstrem (195%-305% nilai buku).</div>
          <div><Tag color="#cf1322" style={{ marginRight: 8, fontWeight: 600 }}>F2</Tag><strong>Anomali - Indikasi Penahanan Aset &amp; Servis Fiktif Berulang:</strong> Alat tertahan lama (48-82 hari) disertai servis berulang &amp; QC ulang.</div>
          <div><Tag color="#cf1322" style={{ marginRight: 8, fontWeight: 600 }}>F3</Tag><strong>Anomali - Kolusi Multi-Indikator Ekstrem:</strong> Kombinasi servis sangat sering (3-4x), biaya &gt; 220% nilai buku, dan penguasaan aset &gt; 52 hari.</div>
        </div>
      </Card>
    </div>
  );
}
