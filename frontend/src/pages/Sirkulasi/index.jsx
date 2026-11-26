import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  no_bast: { type: 'string', label: 'No. BAST', required: true },
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
  kode_bmn: { type: 'string', label: 'Kode BMN / Perangkat', required: true },
  peminjam_satker: { type: 'string', label: 'Personel / Satker', required: true },
  tgl_pinjam: { type: 'date', label: 'Tgl Pinjam / Mutasi', required: true },
  tgl_kembali_rencana: { type: 'date', label: 'Rencana Kembali', required: true },
  tgl_kembali_aktual: { type: 'date', label: 'Kembali Aktual' },
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

export default function SirkulasiPage() {
  const config = {
    entity: 'sirkulasi',
    PANEL_TITLE: 'Sirkulasi & BAST Digital',
    DATATABLE_TITLE: 'Daftar Sirkulasi Peminjaman & Mutasi BMN',
    ADD_NEW_ENTITY: 'Ajukan Sirkulasi',
    ENTITY_NAME: 'sirkulasi',
    fields,
    searchConfig: { displayLabels: ['no_bast', 'no_surat_perintah'], searchFields: 'no_bast,no_surat_perintah' },
    deleteModalLabels: ['no_bast'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

