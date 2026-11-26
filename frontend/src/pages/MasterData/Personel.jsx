import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  nrp: { type: 'string', label: 'NRP / NIP', required: true },
  nama_lengkap: { type: 'string', label: 'Nama Lengkap', required: true },
  pangkat: { type: 'string', label: 'Pangkat' },
  jabatan: { type: 'string', label: 'Jabatan' },
  satker: { type: 'string', label: 'Satuan Kerja', required: true },
  telepon: { type: 'phone', label: 'No. HP / WA' },
};

export default function PersonelPage() {
  const config = {
    entity: 'personel',
    PANEL_TITLE: 'Data Personel',
    DATATABLE_TITLE: 'Daftar Personel (NRP)',
    ADD_NEW_ENTITY: 'Tambah Personel',
    ENTITY_NAME: 'personel',
    fields,
    searchConfig: {
      displayLabels: ['nrp', 'nama_lengkap', 'satker'],
      searchFields: 'nrp,nama_lengkap,satker',
    },
    filterFields: [
      { key: 'satker', label: 'Satuan Kerja' },
      { key: 'pangkat', label: 'Pangkat' },
    ],
    deleteModalLabels: ['nama_lengkap'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

