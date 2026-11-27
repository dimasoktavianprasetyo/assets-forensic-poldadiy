import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import { AlertOutlined, AuditOutlined } from '@ant-design/icons';
import { request } from '@/request';

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
  const [alerts, setAlerts] = useState(PREVIEW_ALERTS);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [form] = Form.useForm();

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
            Early Warning Alert & Audit Investigasi (Pengawas Internal)
          </span>
        }
        bordered={false}
        className="whiteBox shadow"
      >
        <Table rowKey="_id" columns={columns} dataSource={alerts} loading={loading} pagination={{ pageSize: 10 }} />
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

