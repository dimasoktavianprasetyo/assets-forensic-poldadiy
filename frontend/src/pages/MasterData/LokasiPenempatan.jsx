import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  kode_ruangan: { type: 'string', label: 'Kode Ruangan (DIR)', required: true },
  nama_ruangan: { type: 'string', label: 'Nama Ruangan', required: true },
  gedung: { type: 'string', label: 'Gedung', required: true },
  lantai: { type: 'string', label: 'Lantai' },
  penanggung_jawab: { type: 'string', label: 'Penanggung Jawab DIR' },
};

export default function LokasiPenempatanPage() {
  const config = {
    entity: 'lokasi',
    PANEL_TITLE: 'Lokasi Penempatan (DIR)',
    DATATABLE_TITLE: 'Daftar Ruangan & Lokasi Penempatan Aset',
    ADD_NEW_ENTITY: 'Tambah Lokasi',
    ENTITY_NAME: 'lokasi',
    fields,
    searchConfig: {
      displayLabels: ['kode_ruangan', 'nama_ruangan', 'gedung'],
      searchFields: 'kode_ruangan,nama_ruangan,gedung',
    },
    filterFields: [
      { key: 'gedung', label: 'Gedung' },
      { key: 'lantai', label: 'Lantai' },
    ],
    deleteModalLabels: ['nama_ruangan'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

