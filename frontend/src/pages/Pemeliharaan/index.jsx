import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  no_tiket: { type: 'string', label: 'No. Tiket Servis', required: true },
  kode_bmn: { type: 'string', label: 'Kode BMN / Perangkat', required: true },
  jenis_kerusakan: { type: 'string', label: 'Diagnosis Kerusakan', required: true },
  no_spk: { type: 'string', label: 'No. SPK Vendor' },
  vendor: { type: 'string', label: 'Vendor Pelaksana' },
  status_qc: {
    type: 'selectWithTranslation',
    label: 'Uji Kelayakan Teknis (QC)',
    required: true,
    defaultValue: 'Menunggu QC',
    options: [
      { value: 'Menunggu QC', label: 'Menunggu QC', color: '#d48806' },
      { value: 'Lolos QC', label: 'Lolos QC', color: '#389e0d' },
      { value: 'Servis Ulang', label: 'Servis Ulang', color: '#cf1322' },
    ],
  },
  total_biaya: { type: 'number', label: 'Total Biaya Servis (Rp)' },
  status_verifikasi: {
    type: 'selectWithTranslation',
    label: 'Status Verifikasi',
    defaultValue: 'Proses',
    options: [
      { value: 'Proses', label: 'Proses', color: '#0958d9' },
      { value: 'Selesai', label: 'Selesai & BAST', color: '#389e0d' },
    ],
  },
};

export default function PemeliharaanPage() {
  const config = {
    entity: 'pemeliharaan',
    PANEL_TITLE: 'Pemeliharaan & Uji QC',
    DATATABLE_TITLE: 'Tiket Kerusakan, SPK Vendor, Uji QC & Biaya Servis',
    ADD_NEW_ENTITY: 'Buat Tiket Kerusakan',
    ENTITY_NAME: 'pemeliharaan',
    fields,
    searchConfig: { displayLabels: ['no_tiket', 'kode_bmn'], searchFields: 'no_tiket,kode_bmn' },
    deleteModalLabels: ['no_tiket'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

