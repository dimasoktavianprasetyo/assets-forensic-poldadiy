import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, notification, Popconfirm, Row, Space, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { request } from '@/request';
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
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { crud } from '@/redux/crud/actions';
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
    mode: 'multiple',
    label: 'Perangkat & Kode BMN',
    required: true,
    entity: 'aset',
    displayLabels: ['kode_bmn', 'nama_perangkat', 'status_operasional'],
    outputValue: 'kode_bmn',
    placeholder: 'Pilih 1 atau lebih perangkat BMN...',
    customRender: (val, record) => (
      <div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{record?.nama_perangkat || val}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Kode BMN: {val}</div>
      </div>
    ),
  },
  id_lokasi_tujuan: {
    type: 'async',
    label: 'Lokasi Penempatan Tujuan (Khusus Mutasi)',
    entity: 'lokasi',
    displayLabels: ['kode_ruangan', 'nama_ruangan'],
    outputValue: 'id_lokasi',
    placeholder: 'Pilih ruangan tujuan jika Mutasi...',
    disableForTable: true,
    disableForRead: true,
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
  frekuensi_pinjam: {
    type: 'date',
    label: 'Frekuensi Pinjam',
    disableForForm: true,
    disableForUpdate: true,
    disableForRead: true,
    customRender: (val) => {
      const n = Number(val || 1);
      return (
        <Tag color={n >= 3 ? '#cf1322' : n === 2 ? '#d48806' : '#0958d9'} style={{ margin: 0 }}>
          {n}x Dipinjam
        </Tag>
      );
    },
  },
  ketepatan_waktu: {
    type: 'date',
    label: 'Ketepatan Waktu',
    disableForForm: true,
    disableForUpdate: true,
    disableForRead: true,
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
  nama_petugas: {
    type: 'string',
    label: 'Petugas Pencatat',
    disableForForm: true,
    disableForUpdate: true,
    nowrap: true,
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

  const freqMap = {};
  items.forEach((i) => {
    const k = i.kode_bmn || 'Lainnya';
    if (!freqMap[k]) {
      freqMap[k] = {
        kode_bmn: k,
        nama: i.nama_perangkat ? (i.nama_perangkat.length > 16 ? `${i.nama_perangkat.slice(0, 16)}...` : i.nama_perangkat) : k,
        fullNama: i.nama_perangkat ? `${i.nama_perangkat} (${k})` : k,
        jumlah: Number(i.frekuensi_pinjam || 0) || 1,
        _count: 1,
      };
    } else {
      freqMap[k]._count += 1;
      freqMap[k].jumlah = Math.max(freqMap[k].jumlah, freqMap[k]._count);
    }
  });
  const freqChartData = Object.values(freqMap)
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 6);

  const satkerMap = {};
  items.forEach((i) => {
    const p = i.peminjam_satker || 'Lainnya';
    if (!satkerMap[p]) {
      satkerMap[p] = {
        nama: p.length > 22 ? `${p.slice(0, 22)}...` : p,
        fullNama: p,
        jumlah: 1,
      };
    } else {
      satkerMap[p].jumlah += 1;
    }
  });
  const satkerChartData = Object.values(satkerMap)
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 6);

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 0, marginBottom: -8 }}>
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
            <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <Pie
                data={jenisData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                startAngle={45}
                endAngle={-315}
                innerRadius={44}
                outerRadius={64}
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

      <Col xs={24} lg={12}>
        <Card
          title="Frekuensi Pinjam per Alat (x Kali)"
          bordered={false}
          className="whiteBox shadow"
          style={{ height: '100%' }}
        >
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={freqChartData} layout="vertical" margin={{ top: 5, right: 24, bottom: 5, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickFormatter={(v) => `${v}x`} />
              <YAxis type="category" dataKey="nama" width={150} tick={{ fontSize: 11.5 }} />
              <Tooltip
                formatter={(v) => [`${v}x Dipinjam`, 'Frekuensi']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullNama || ''}
              />
              <Bar dataKey="jumlah" name="Frekuensi Pinjam" fill="#0958d9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card
          title="Aktivitas Peminjaman & Mutasi per Satker / Personel"
          bordered={false}
          className="whiteBox shadow"
          style={{ height: '100%' }}
        >
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={satkerChartData} layout="vertical" margin={{ top: 5, right: 24, bottom: 5, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickFormatter={(v) => `${v} BAST`} />
              <YAxis type="category" dataKey="nama" width={155} tick={{ fontSize: 11.5 }} />
              <Tooltip
                formatter={(v) => [`${v} Dokumen BAST`, 'Total Aktivitas']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullNama || ''}
              />
              <Bar dataKey="jumlah" name="Jumlah BAST" fill="#08979c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}

function SirkulasiFormWithRiskAlert({ fields, isUpdateForm = false, isSatker = false }) {
  const form = Form.useFormInstance();
  const kodeBmn = Form.useWatch('kode_bmn', form);
  const [riskInfo, setRiskInfo] = useState(null);

  useEffect(() => {
    if (isSatker && !isUpdateForm) {
      form.setFieldsValue({ status_pinjam: 'Menunggu Verifikasi' });
    }
  }, [isSatker, isUpdateForm, form]);

  useEffect(() => {
    let active = true;
    const kode = typeof kodeBmn === 'object' ? kodeBmn?.kode_bmn : kodeBmn;
    if (!kode || String(kode).trim() === '') {
      setRiskInfo(null);
      return;
    }
    request
      .get({ entity: `aset/risk-check?kode_bmn=${encodeURIComponent(kode)}` })
      .then((res) => {
        if (!active || !res?.success || !res?.result) return;
        setRiskInfo(res.result);
        if (res.result.warnings?.length) {
          const isErr = res.result.severity === 'error';
          notification[isErr ? 'error' : 'warning']({
            message: isErr
              ? `PERINGATAN KERAS: Aset ${res.result.aset?.kode_bmn} Bermasalah!`
              : `Peringatan Dini: Aset ${res.result.aset?.kode_bmn} Dalam Pengawasan`,
            description: res.result.warnings[0],
            placement: 'topRight',
            duration: 6,
          });
        }
      })
      .catch(() => {
        if (active) setRiskInfo(null);
      });
    return () => {
      active = false;
    };
  }, [kodeBmn]);

  return (
    <>
      {riskInfo && (
        <Alert
          type={riskInfo.severity || 'info'}
          showIcon
          style={{ marginBottom: 16 }}
          message={
            riskInfo.severity === 'error'
              ? `PERINGATAN KERAS: ${riskInfo.aset?.nama_perangkat} (${riskInfo.aset?.kode_bmn}) Bermasalah!`
              : riskInfo.severity === 'warning'
                ? `PERINGATAN DINI: ${riskInfo.aset?.nama_perangkat} (${riskInfo.aset?.kode_bmn}) Perlu Pengawasan`
                : `Status Aset Normal & Tersedia (${riskInfo.aset?.kode_bmn})`
          }
          description={
            riskInfo.warnings?.length ? (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {riskInfo.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              `Klaster K-Means: ${riskInfo.kmeans?.klaster_label || 'Normal'} | Kondisi: ${riskInfo.aset?.kondisi} | Status: ${riskInfo.aset?.status_operasional}`
            )
          }
        />
      )}
      <DynamicForm fields={fields} isUpdateForm={isUpdateForm} />
    </>
  );
}

const STATUS_TAG_COLORS = {
  'Menunggu Verifikasi': '#595959',
  Dipinjam: '#0958d9',
  Terlambat: '#cf1322',
  Selesai: '#389e0d',
};

export default function SirkulasiPage() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const role = currentAdmin?.role;
  const isSatker = role === 'satker';
  const canVerify = ['operator_teknisi', 'admin_subbagrenmin', 'owner'].includes(role);
  const [verifyingId, setVerifyingId] = useState(null);

  const handleVerify = async (record) => {
    const id = record?.id_pinjam || record?._id;
    if (!id) return;
    setVerifyingId(id);
    try {
      const res = await request.patch({
        entity: `sirkulasi/update/${id}`,
        jsonData: { status_pinjam: 'Dipinjam' },
      });
      if (res?.success) {
        dispatch(crud.list({ entity: 'sirkulasi' }));
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const scopedFields = useMemo(
    () => ({
      ...fields,
      tgl_kembali_aktual: {
        ...fields.tgl_kembali_aktual,
        disableForForm: isSatker,
        disableForUpdate: isSatker,
      },
      status_pinjam: {
        ...fields.status_pinjam,
        disableForForm: isSatker,
        disableForUpdate: isSatker,
        customRender: (val, record) => {
          const id = record?.id_pinjam || record?._id;
          return (
            <Space size={6} wrap>
              <Tag bordered={false} color={STATUS_TAG_COLORS[val] || '#595959'} style={{ margin: 0 }}>
                {val === 'Selesai' ? 'Selesai / Kembali' : val || '-'}
              </Tag>
              {canVerify && val === 'Menunggu Verifikasi' && (
                <Popconfirm
                  title="Verifikasi pengajuan sirkulasi ini?"
                  description="Status akan diubah menjadi Dipinjam dan aset ditandai Dipinjam."
                  okText="Ya, Verifikasi"
                  cancelText="Batal"
                  onConfirm={() => handleVerify(record)}
                >
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={verifyingId === id}
                  >
                    Verifikasi
                  </Button>
                </Popconfirm>
              )}
            </Space>
          );
        },
      },
    }),
    [isSatker, canVerify, verifyingId]
  );

  const config = {
    entity: 'sirkulasi',
    PANEL_TITLE: 'Sirkulasi & BAST Digital',
    DATATABLE_TITLE: 'Daftar Sirkulasi Peminjaman & Mutasi BMN',
    ADD_NEW_ENTITY: 'Ajukan Sirkulasi',
    ENTITY_NAME: 'sirkulasi',
    fields: scopedFields,
    searchConfig: {
      displayLabels: ['no_bast', 'kode_bmn', 'peminjam_satker'],
      searchFields: 'no_bast,no_surat_perintah,kode_bmn,peminjam_satker',
    },
    deleteModalLabels: ['no_bast'],
  };
  return (
    <>
      <SirkulasiIsometricChart />
      <CrudModule
        createForm={<SirkulasiFormWithRiskAlert fields={scopedFields} isSatker={isSatker} />}
        updateForm={<SirkulasiFormWithRiskAlert fields={scopedFields} isUpdateForm isSatker={isSatker} />}
        config={config}
      />
    </>
  );
}

