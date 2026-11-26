import { Button, Card, Col, Row, message } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '@/config/serverApiConfig';

const LAPORAN_LIST = [
  {
    jenis: 'inventaris-depresiasi',
    title: 'Laporan Inventaris & Depresiasi BMN',
    desc: 'Rekapitulasi aset TIK, nilai perolehan (Rp), penyusutan garis lurus, nilai buku, dan kondisi B/RR/RB.',
  },
  {
    jenis: 'sirkulasi-mutasi',
    title: 'Laporan Sirkulasi Peminjaman & Mutasi',
    desc: 'Riwayat BAST digital, peminjaman Satker, mutasi ruangan (DIR), dan keterlambatan pengembalian (X3).',
  },
  {
    jenis: 'pemeliharaan-qc',
    title: 'Laporan Pemeliharaan, SPK & Uji QC',
    desc: 'Rekap tiket kerusakan, perbaikan vendor, hasil uji kelayakan teknis (status_qc), dan biaya servis (Rp).',
  },
  {
    jenis: 'audit-kmeans',
    title: 'Laporan Audit K-Means & Early Warning Fraud',
    desc: 'Hasil klasterisasi K=3, kurva Elbow SSE, Silhouette Score, alert risiko Kuning/Merah, dan hasil audit investigasi.',
  },
];

export default function LaporanPage() {
  const handleDownload = (jenis, title) => {
    message.info(`Menyiapkan ekspor PDF berkop BID TIK Polda DIY: ${title}`);
    window.open(`${API_BASE_URL}laporan/pdf/${jenis}`, '_blank');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: 16 }}>Laporan PDF Resmi (Kop BID TIK Polda D.I. Yogyakarta)</h2>
      <Row gutter={[16, 16]}>
        {LAPORAN_LIST.map((lap) => (
          <Col xs={24} md={12} key={lap.jenis}>
            <Card title={lap.title} bordered={false} className="whiteBox shadow">
              <p style={{ minHeight: 44, color: '#555' }}>{lap.desc}</p>
              <Button type="primary" icon={<FilePdfOutlined />} onClick={() => handleDownload(lap.jenis, lap.title)}>
                Unduh Laporan PDF
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

