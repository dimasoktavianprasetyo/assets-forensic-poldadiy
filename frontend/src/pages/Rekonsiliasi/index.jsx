import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  no_bar: {
    type: 'string',
    label: 'No. Berita Acara (BAR)',
    placeholder: 'Otomatis jika dikosongkan (BAR/TIK/...)',
  },
  periode: {
    type: 'select',
    label: 'Periode Stock Opname',
    required: true,
    defaultValue: 'Semester I',
    options: [
      { value: 'Semester I', label: 'Semester I' },
      { value: 'Semester II', label: 'Semester II' },
    ],
  },
  tahun: { type: 'number', label: 'Tahun', required: true },
  satker: {
    type: 'async',
    label: 'Satuan Kerja',
    required: true,
    entity: 'satker',
    displayLabels: ['kode_satker', 'nama_satker'],
    outputValue: 'nama_satker',
    placeholder: 'Pilih Satuan Kerja dari database...',
    color: '#1d39c4',
  },
  status_rekon: {
    type: 'selectWithTranslation',
    label: 'Hasil Rekonsiliasi',
    required: true,
    defaultValue: 'Sesuai',
    options: [
      { value: 'Sesuai', label: 'Sesuai', color: '#389e0d' },
      { value: 'Selisih Lokasi', label: 'Selisih Lokasi', color: '#d48806' },
      { value: 'Selisih Kondisi', label: 'Selisih Kondisi', color: '#cf1322' },
    ],
  },
  catatan: { type: 'textarea', label: 'Catatan Pemeriksaan', disableForTable: true },
};

export default function RekonsiliasiPage() {
  const config = {
    entity: 'rekonsiliasi',
    PANEL_TITLE: 'Rekonsiliasi BMN',
    DATATABLE_TITLE: 'Stock Opname & Berita Acara Rekonsiliasi (BAR)',
    ADD_NEW_ENTITY: 'Buat Rekonsiliasi',
    ENTITY_NAME: 'rekonsiliasi',
    fields,
    searchConfig: { displayLabels: ['no_bar', 'satker'], searchFields: 'no_bar,satker' },
    deleteModalLabels: ['no_bar'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

