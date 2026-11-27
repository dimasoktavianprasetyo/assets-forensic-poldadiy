import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import {
  Alert,
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Upload,
  message,
} from 'antd';
import {
  BankOutlined,
  CalculatorOutlined,
  RadarChartOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import TabsContent from '@/components/TabsContent/TabsContent';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

const STORAGE_KEY = 'sim_aset_bid_tik_settings';

const PANGKAT_POLRI_OPTIONS = [
  {
    label: 'Tamtama',
    options: [
      { value: 'BHAYANGKARA DUA', label: 'BHAYANGKARA DUA' },
      { value: 'BHAYANGKARA SATU', label: 'BHAYANGKARA SATU' },
      { value: 'BHAYANGKARA KEPALA', label: 'BHAYANGKARA KEPALA' },
      { value: 'AJUN BRIGADIR POLISI DUA', label: 'AJUN BRIGADIR POLISI DUA' },
      { value: 'AJUN BRIGADIR POLISI SATU', label: 'AJUN BRIGADIR POLISI SATU' },
      { value: 'AJUN BRIGADIR POLISI', label: 'AJUN BRIGADIR POLISI' },
    ],
  },
  {
    label: 'Bintara',
    options: [
      { value: 'BRIGADIR POLISI DUA', label: 'BRIGADIR POLISI DUA' },
      { value: 'BRIGADIR POLISI SATU', label: 'BRIGADIR POLISI SATU' },
      { value: 'BRIGADIR POLISI', label: 'BRIGADIR POLISI' },
      { value: 'BRIGADIR POLISI KEPALA', label: 'BRIGADIR POLISI KEPALA' },
      { value: 'AJUN INSPEKTUR POLISI DUA', label: 'AJUN INSPEKTUR POLISI DUA' },
      { value: 'AJUN INSPEKTUR POLISI SATU', label: 'AJUN INSPEKTUR POLISI SATU' },
    ],
  },
  {
    label: 'Perwira Pertama (Pama)',
    options: [
      { value: 'INSPEKTUR POLISI DUA', label: 'INSPEKTUR POLISI DUA' },
      { value: 'INSPEKTUR POLISI SATU', label: 'INSPEKTUR POLISI SATU' },
      { value: 'AJUN KOMISARIS POLISI', label: 'AJUN KOMISARIS POLISI' },
    ],
  },
  {
    label: 'Perwira Menengah (Pamen)',
    options: [
      { value: 'KOMISARIS POLISI', label: 'KOMISARIS POLISI' },
      { value: 'AJUN KOMISARIS BESAR POLISI', label: 'AJUN KOMISARIS BESAR POLISI' },
      { value: 'KOMISARIS BESAR POLISI', label: 'KOMISARIS BESAR POLISI' },
    ],
  },
];

function loadSavedSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSettingsLocal(partial) {
  const current = loadSavedSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
}

function ProfilKesatuanTab({ canEdit }) {
  const saved = loadSavedSettings();
  const [form] = Form.useForm();
  const [logoKiri, setLogoKiri] = useState(saved.logo_polda || '/Lambang_Polda_DIY.png');
  const [logoKanan, setLogoKanan] = useState(saved.logo_tik || '/TIK_POLRI.png');

  const instansi = Form.useWatch('nama_instansi', form) || 'KEPOLISIAN DAERAH D.I. YOGYAKARTA';
  const satker = Form.useWatch('nama_satker', form) || 'BIDANG TEKNOLOGI INFORMASI DAN KOMUNIKASI (BID TIK)';
  const alamat = Form.useWatch('alamat_markas', form) || 'Jl. Ringroad Utara, Condongcatur, Depok, Sleman, D.I. Yogyakarta 55283';
  const previewFormat = Form.useWatch('format_tanggal', form) || saved.format_tanggal || 'DD/MM/YYYY';
  const previewTz = Form.useWatch('zona_waktu', form) || saved.zona_waktu || 'WIB';

  const handleUpload = (setter, key) => ({ file }) => {
    const raw = file.originFileObj || file;
    if (!raw) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setter(e.target.result);
      saveSettingsLocal({ [key]: e.target.result });
      message.success(`Logo "${raw.name}" berhasil diperbarui pada kop surat!`);
    };
    reader.readAsDataURL(raw);
  };

  const handleSave = (values) => {
    saveSettingsLocal(values);
    message.success('Profil Kesatuan & Kop Laporan PDF berhasil disimpan!');
  };

  return (
    <Form
      form={form}
      layout="vertical"
      disabled={!canEdit}
      onFinish={handleSave}
      initialValues={{
        nama_instansi: saved.nama_instansi || 'KEPOLISIAN DAERAH D.I. YOGYAKARTA',
        nama_satker: saved.nama_satker || 'BIDANG TEKNOLOGI INFORMASI DAN KOMUNIKASI (BID TIK)',
        alamat_markas: saved.alamat_markas || 'Jl. Ringroad Utara, Condongcatur, Depok, Sleman, D.I. Yogyakarta 55283',
        format_tanggal: saved.format_tanggal || 'DD/MM/YYYY',
        zona_waktu: saved.zona_waktu || 'WIB',
        jabatan_penandatangan: saved.jabatan_penandatangan || 'Kepala Bidang TIK Polda D.I. Yogyakarta',
        pangkat_kabid: saved.pangkat_kabid || 'KOMISARIS BESAR POLISI',
        nama_kabid: saved.nama_kabid || saved.nama_pangkat_kabid || '',
        nrp_kabid: saved.nrp_kabid || '',
      }}
      style={{ maxWidth: 760 }}
    >
      <Form.Item name="nama_instansi" label="Nama Instansi Induk" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="nama_satker" label="Nama Satuan Kerja" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="alamat_markas" label="Alamat Markas" rules={[{ required: true }]}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Divider orientation="left">Pejabat Penandatangan Laporan PDF</Divider>

      <Form.Item name="jabatan_penandatangan" label="Jabatan" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={9}>
          <Form.Item name="pangkat_kabid" label="Pangkat" rules={[{ required: true, message: 'Pangkat wajib dipilih' }]}>
            <Select showSearch placeholder="Pilih Pangkat Polri..." options={PANGKAT_POLRI_OPTIONS} />
          </Form.Item>
        </Col>
        <Col xs={24} md={9}>
          <Form.Item name="nama_kabid" label="Nama Pejabat" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
            <Input placeholder="Contoh: Dr. ..., S.I.K., M.Si." />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item name="nrp_kabid" label="NRP" rules={[{ required: true, message: 'NRP wajib diisi' }]}>
            <Input placeholder="Contoh: 74080512" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={14}>
          <Form.Item name="format_tanggal" label="Format Tanggal Sistem" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Contoh: 28/11/2026)' },
                { value: 'DD MMMM YYYY', label: 'DD MMMM YYYY (Contoh: 28 November 2026)' },
                { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (Contoh: 28-11-2026)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (Contoh: 2026-11-28)' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={10}>
          <Form.Item name="zona_waktu" label="Zona Waktu Sistem" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'WIB', label: 'WIB (UTC+7 - DIY / Jawa / Sumatera)' },
                { value: 'WITA', label: 'WITA (UTC+8 - Bali / Kalimantan / Sulawesi)' },
                { value: 'WIT', label: 'WIT (UTC+9 - Maluku / Papua)' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      <div style={{ marginTop: -8, marginBottom: 16, fontSize: 12.5, color: '#475569' }}>
        Pratinjau Tampilan Waktu:{' '}
        <Tag color="#0958d9" style={{ marginLeft: 4 }}>
          {dayjs().locale('id').format(previewFormat)} {dayjs().format('HH:mm')} {previewTz}
        </Tag>
      </div>

      <Divider orientation="left">Upload Logo & Preview Kop Surat Resmi PDF</Divider>

      <Space wrap style={{ marginBottom: 16 }}>
        <Upload accept="image/*" showUploadList={false} beforeUpload={() => false} onChange={handleUpload(setLogoKiri, 'logo_polda')}>
          <Button icon={<UploadOutlined />}>Upload Logo Kiri (Polda DIY)</Button>
        </Upload>
        <Upload accept="image/*" showUploadList={false} beforeUpload={() => false} onChange={handleUpload(setLogoKanan, 'logo_tik')}>
          <Button icon={<UploadOutlined />}>Upload Logo Kanan (TIK Polri)</Button>
        </Upload>
      </Space>

      <div
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          padding: '16px 20px',
          background: '#fafafa',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            borderBottom: '3px double #1f2937',
            paddingBottom: 12,
          }}
        >
          <img src={logoKiri} alt="Logo Polda DIY" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{instansi}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{satker}</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{alamat}</div>
          </div>
          <img src={logoKanan} alt="Logo TIK Polri" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          Pratinjau Kop Surat Resmi untuk ekspor BAST, BAR, SPK, dan Laporan Manajerial PDF
        </div>
      </div>

      <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
        Simpan Pengaturan
      </Button>
    </Form>
  );
}

function ParameterBmnTab({ canEdit }) {
  const saved = loadSavedSettings();
  const [form] = Form.useForm();

  const handleSave = (values) => {
    saveSettingsLocal(values);
    message.success('Parameter BMN & Depresiasi berhasil disimpan!');
  };

  return (
    <Form
      form={form}
      layout="vertical"
      disabled={!canEdit}
      onFinish={handleSave}
      initialValues={{
        metode_penyusutan: 'Metode Garis Lurus (Straight-Line Depreciation)',
        nilai_residu: saved.nilai_residu ?? 0,
        masa_radio_ht: saved.masa_radio_ht ?? 4,
        masa_komputer: saved.masa_komputer ?? 4,
        masa_jaringan: saved.masa_jaringan ?? 5,
        masa_server: saved.masa_server ?? 8,
        batas_hari_pinjam: saved.batas_hari_pinjam ?? 7,
        data_masking_seri: saved.data_masking_seri ?? true,
      }}
      style={{ maxWidth: 760 }}
    >
      <Form.Item
        label="Metode Penyusutan Aset"
        extra="Terkunci sesuai ketentuan PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN."
      >
        <Space>
          <Input disabled value="Metode Garis Lurus (Straight-Line Depreciation)" style={{ width: 380 }} />
          <Tag color="#1d39c4" style={{ margin: 0 }}>PMK 181/PMK.06/2016</Tag>
        </Space>
      </Form.Item>

      <Form.Item name="nilai_residu" label="Nilai Residu Default (Rp)">
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => v.replace(/Rp\s?|(\.*)/g, '')}
        />
      </Form.Item>

      <Divider orientation="left">Estimasi Masa Manfaat Default per Kategori (Tahun)</Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="masa_radio_ht" label="Perangkat Radio HT & Alkom">
            <InputNumber min={4} max={8} addonAfter="Tahun" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="masa_komputer" label="Komputer / Laptop / PC Dinas">
            <InputNumber min={4} max={8} addonAfter="Tahun" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="masa_jaringan" label="Perangkat Jaringan (Router / Switch / Repeater)">
            <InputNumber min={4} max={8} addonAfter="Tahun" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="masa_server" label="Infrastruktur Server & Rak Data">
            <InputNumber min={4} max={8} addonAfter="Tahun" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="batas_hari_pinjam"
        label="Batas Maksimal Peminjaman Operasional (Default)"
        extra="Lewat dari batas ini status otomatis menjadi Terlambat & memicu Notifikasi Overdue."
      >
        <InputNumber min={1} max={365} addonAfter="Hari" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="data_masking_seri"
        valuePropName="checked"
        label="Mode Data Masking Nomor Seri"
        extra="Penyamaran nomor seri pabrikan pada ekspor laporan publik sesuai batasan UU KIP No. 14/2008 Pasal 17."
      >
        <Switch checkedChildren="ON" unCheckedChildren="OFF" />
      </Form.Item>

      <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
        Simpan Pengaturan
      </Button>
    </Form>
  );
}

function ParameterKMeansTab({ canEdit }) {
  const saved = loadSavedSettings();
  const [form] = Form.useForm();

  const handleSave = (values) => {
    saveSettingsLocal(values);
    message.success('Parameter Analitik K-Means & Early Warning berhasil disimpan!');
  };

  return (
    <Form
      form={form}
      layout="vertical"
      disabled={!canEdit}
      onFinish={handleSave}
      initialValues={{
        jumlah_klaster: saved.jumlah_klaster ?? 3,
        max_iterasi: saved.max_iterasi ?? 100,
        elbow_min: saved.elbow_min ?? 1,
        elbow_max: saved.elbow_max ?? 8,
      }}
      style={{ maxWidth: 760 }}
    >
      <Form.Item
        name="jumlah_klaster"
        label="Jumlah Klaster Default (K)"
        extra="3 klaster profil risiko: Normal, Waspada, dan Anomali / Indikasi Fraud."
      >
        <InputNumber min={2} max={8} style={{ width: '100%' }} />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="Metode Normalisasi Fitur [X1, X2, X3]">
            <Space>
              <Input disabled value="Min-Max Normalization [0, 1]" style={{ width: 230 }} />
              <Tag color="#1d39c4" style={{ margin: 0 }}>Standar Sistem</Tag>
            </Space>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Metrik Jarak">
            <Space>
              <Input disabled value="Euclidean Distance" style={{ width: 200 }} />
              <Tag color="#595959" style={{ margin: 0 }}>Standar K-Means</Tag>
            </Space>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="max_iterasi" label="Maksimum Iterasi Konvergensi">
        <InputNumber min={10} max={1000} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item label="Rentang Evaluasi Elbow Method (SSE)">
        <Space align="center">
          <span>K =</span>
          <Form.Item name="elbow_min" noStyle>
            <InputNumber min={1} max={5} />
          </Form.Item>
          <span>s.d. K =</span>
          <Form.Item name="elbow_max" noStyle>
            <InputNumber min={3} max={15} />
          </Form.Item>
        </Space>
      </Form.Item>

      <Divider orientation="left">Ambang Peringatan Dini (Early Warning System)</Divider>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color="#389e0d" style={{ margin: 0, minWidth: 165, textAlign: 'center', fontWeight: 600 }}>
            Normal (Klaster 0)
          </Tag>
          <span>Perilaku biaya servis & durasi pinjam wajar.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color="#d48806" style={{ margin: 0, minWidth: 165, textAlign: 'center', fontWeight: 600 }}>
            Waspada (Klaster 1)
          </Tag>
          <span>Rasio biaya pemeliharaan &ge; 50% nilai buku atau frekuensi servis meningkat.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color="#cf1322" style={{ margin: 0, minWidth: 165, textAlign: 'center', fontWeight: 600 }}>
            Risiko Tinggi (Klaster 2)
          </Tag>
          <span>Rasio biaya pemeliharaan &ge; 80% nilai buku / lonjakan ekstrem & outlier (memicu alert investigasi).</span>
        </div>
      </div>

      <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
        Simpan Pengaturan
      </Button>
    </Form>
  );
}

export default function Settings() {
  const { settingsKey } = useParams();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const role = currentAdmin?.role || 'owner';
  const canEdit = role === 'owner' || role === 'admin_subbagrenmin';

  const content = [
    {
      key: 'profil_kesatuan',
      label: 'Profil Kesatuan & Kop Laporan PDF',
      icon: <BankOutlined />,
      children: (
        <>
          {!canEdit && (
            <Alert
              type="warning"
              showIcon
              message="Akses Terbatas (Mode Baca)"
              description="Hanya peran Admin Subbagrenmin yang berhak mengubah pengaturan sistem & parameter BMN/K-Means."
              style={{ marginBottom: 16 }}
            />
          )}
          <ProfilKesatuanTab canEdit={canEdit} />
        </>
      ),
    },
    {
      key: 'parameter_bmn',
      label: 'Parameter BMN & Depresiasi',
      icon: <CalculatorOutlined />,
      children: <ParameterBmnTab canEdit={canEdit} />,
    },
    {
      key: 'parameter_kmeans',
      label: 'Parameter Analitik K-Means & Early Warning',
      icon: <RadarChartOutlined />,
      children: <ParameterKMeansTab canEdit={canEdit} />,
    },
  ];

  return (
    <TabsContent
      defaultActiveKey={settingsKey || 'profil_kesatuan'}
      content={content}
      pageTitle="Pengaturan Sistem & Parameter BMN/K-Means"
    />
  );
}
