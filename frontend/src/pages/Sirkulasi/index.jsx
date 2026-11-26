import { Card, Col, Row, Tag } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { selectListItems } from '@/redux/crud/selectors';
import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  no_bast: {
    type: 'string',
    label: 'No. BAST',
    placeholder: 'Otomatis jika dikosongkan (BAST/TIK/...)',
  },
  jenis_sirkulasi: {
    type: 'selectWithTranslation',
    label: 'Jenis Sirkulasi',
    required: true,
    defaultValue: 'Peminjaman',
    options: [
      { value: 'Peminjaman', label: 'Peminjaman', color: '#0958d9' },
      { value: 'Mutasi', label: 'Mutasi Penempatan', color: '#08979c' },
    ],
  },
  no_surat_perintah: { type: 'string', label: 'No. Surat Perintah', required: true },
  kode_bmn: {
    type: 'async',
    label: 'Kode BMN / Perangkat',
    required: true,
    entity: 'aset',
    displayLabels: ['kode_bmn', 'nama_perangkat', 'status_operasional'],
    outputValue: 'kode_bmn',
    placeholder: 'Cari kode BMN atau nama perangkat...',
  },
  peminjam_satker: {
    type: 'async',
    label: 'Personel / Satker',
    required: true,
    entity: 'personel',
    displayLabels: ['nama_lengkap', 'satker'],
    outputValue: 'nama_lengkap',
    placeholder: 'Cari nama personel atau satker...',
    badgeColorFn: (val) => {
      const s = String(val || '').toLowerCase();
      if (s.includes('tekkom')) return '#0958d9';
      if (s.includes('tekinfo')) return '#08979c';
      if (s.includes('lalu lintas') || s.includes('lantas')) return '#531dab';
      if (s.includes('reskrim') || s.includes('intel')) return '#d48806';
      return '#1d39c4';
    },
  },
  tgl_pinjam: { type: 'date', label: 'Tgl Pinjam / Mutasi', required: true },
  tgl_kembali_rencana: { type: 'date', label: 'Rencana Kembali', required: true },
  tgl_kembali_aktual: {
    type: 'date',
    label: 'Kembali Aktual',
    customRender: (val, _, dateFormat) => {
      if (!val) return <span style={{ color: '#64748b' }}>Belum Kembali</span>;
      const aktual = dayjs(val);
      return aktual.isValid() ? aktual.format(dateFormat) : '-';
    },
  },
  ketepatan_waktu: {
    type: 'date',
    label: 'Ketepatan Waktu',
    disableForForm: true,
    disableForUpdate: true,
    customRender: (_, record) => {
      const rencana = record?.tgl_kembali_rencana ? dayjs(record.tgl_kembali_rencana).startOf('day') : null;
      if (!record?.tgl_kembali_aktual) {
        if (rencana && rencana.isValid()) {
          const overdue = dayjs().startOf('day').diff(rencana, 'day');
          if (overdue > 0 && record.status_pinjam !== 'Selesai') {
            return <Tag color="#cf1322" style={{ margin: 0 }}>Terlambat {overdue} hr</Tag>;
          }
        }
        return <Tag color="#595959" style={{ margin: 0 }}>Dalam Peminjaman</Tag>;
      }
      const aktual = dayjs(record.tgl_kembali_aktual).startOf('day');
      if (!aktual.isValid() || !rencana || !rencana.isValid()) return '-';
      const diff = aktual.diff(rencana, 'day');
      if (diff < 0) return <Tag color="#389e0d" style={{ margin: 0 }}>Lebih cepat {Math.abs(diff)} hr</Tag>;
      if (diff === 0) return <Tag color="#0958d9" style={{ margin: 0 }}>Tepat Waktu</Tag>;
      return <Tag color="#cf1322" style={{ margin: 0 }}>Terlambat {diff} hr</Tag>;
    },
  },
  kondisi_keluar: {
    type: 'select',
    label: 'Kondisi Keluar',
    defaultValue: 'Baik',
    options: [
      { value: 'Baik', label: 'Baik' },
      { value: 'RR', label: 'Rusak Ringan (RR)' },
    ],
  },
  status_pinjam: {
    type: 'selectWithTranslation',
    label: 'Status Sirkulasi',
    defaultValue: 'Menunggu Verifikasi',
    options: [
      { value: 'Menunggu Verifikasi', label: 'Menunggu Verifikasi', color: '#595959' },
      { value: 'Dipinjam', label: 'Dipinjam', color: '#0958d9' },
      { value: 'Terlambat', label: 'Terlambat', color: '#cf1322' },
      { value: 'Selesai', label: 'Selesai / Kembali', color: '#389e0d' },
    ],
  },
  keperluan_dinas: { type: 'textarea', label: 'Keperluan Dinas', disableForTable: true },
};

function SirkulasiIsometricChart() {
  const { result: listResult } = useSelector(selectListItems);
  const items = Array.isArray(listResult?.items) ? listResult.items : [];
  const total = Math.max(1, items.length);

  const countStatus = (s) => items.filter((i) => i.status_pinjam === s).length;
  const statusChartData = [
    {
      status: 'Menunggu',
      fullStatus: 'Menunggu Verifikasi',
      jumlah: countStatus('Menunggu Verifikasi'),
      pct: Math.round((countStatus('Menunggu Verifikasi') / total) * 100),
      color: '#d48806',
    },
    {
      status: 'Dipinjam',
      fullStatus: 'Sedang Dipinjam',
      jumlah: countStatus('Dipinjam'),
      pct: Math.round((countStatus('Dipinjam') / total) * 100),
      color: '#0958d9',
    },
    {
      status: 'Selesai',
      fullStatus: 'Selesai / Kembali',
      jumlah: countStatus('Selesai'),
      pct: Math.round((countStatus('Selesai') / total) * 100),
      color: '#389e0d',
    },
    {
      status: 'Terlambat',
      fullStatus: 'Terlambat',
      jumlah: countStatus('Terlambat'),
      pct: Math.round((countStatus('Terlambat') / total) * 100),
      color: '#cf1322',
    },
  ];

  const jenisData = [
    { name: 'Peminjaman', value: items.filter((i) => i.jenis_sirkulasi === 'Peminjaman').length, color: '#0958d9' },
    { name: 'Mutasi Penempatan', value: items.filter((i) => i.jenis_sirkulasi === 'Mutasi').length, color: '#08979c' },
  ];
  const baikCount = items.filter((i) => i.kondisi_keluar === 'Baik').length;
  const rrCount = items.filter((i) => i.kondisi_keluar === 'RR').length;

  return (
    <Row gutter={[16, 16]} style={{ margin: '24px 24px -10px' }}>
      <Col xs={24} lg={12}>
        <Card
          title="Ringkasan Status Sirkulasi & BAST Digital (%)"
          bordered={false}
          className="whiteBox shadow"
          style={{ height: '100%' }}
        >
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={statusChartData} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v, _, props) => [`${v}% (${props?.payload?.jumlah ?? 0} Dokumen)`, props?.payload?.fullStatus]}
              />
              <Bar dataKey="pct" name="Persentase (%)" radius={[4, 4, 0, 0]}>
                {statusChartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card
          title="Komposisi Jenis Sirkulasi & Kondisi Keluar"
          bordered={false}
          className="whiteBox shadow"
          style={{ height: '100%' }}
        >
          <ResponsiveContainer width="100%" height={205}>
            <PieChart>
              <Pie
                data={jenisData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={66}
                paddingAngle={4}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {jenisData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <Tag color="#389e0d">Kondisi Keluar Baik: {baikCount} BAST</Tag>
            <Tag color="#d48806">Rusak Ringan (RR): {rrCount} BAST</Tag>
          </div>
        </Card>
      </Col>
    </Row>
  );
}

export default function SirkulasiPage() {
  const config = {
    entity: 'sirkulasi',
    PANEL_TITLE: 'Sirkulasi & BAST Digital',
    DATATABLE_TITLE: 'Daftar Sirkulasi Peminjaman & Mutasi BMN',
    ADD_NEW_ENTITY: 'Ajukan Sirkulasi',
    ENTITY_NAME: 'sirkulasi',
    fields,
    searchConfig: {
      displayLabels: ['no_bast', 'kode_bmn', 'peminjam_satker'],
      searchFields: 'no_bast,no_surat_perintah,kode_bmn,peminjam_satker',
    },
    deleteModalLabels: ['no_bast'],
  };
  return (
    <>
      <SirkulasiIsometricChart />
      <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />
    </>
  );
}

