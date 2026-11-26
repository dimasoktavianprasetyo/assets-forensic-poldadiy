import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  kode_satker: { type: 'string', label: 'Kode Satker', required: true },
  nama_satker: { type: 'string', label: 'Nama Satuan Kerja', required: true },
  pimpinan_satker: { type: 'string', label: 'Pimpinan Satker' },
  telepon: { type: 'phone', label: 'Telepon' },
};

export default function SatkerPage() {
  const config = {
    entity: 'satker',
    PANEL_TITLE: 'Satuan Kerja (Satker)',
    DATATABLE_TITLE: 'Daftar Satuan Kerja BID TIK',
    ADD_NEW_ENTITY: 'Tambah Satker',
    ENTITY_NAME: 'satker',
    fields,
    searchConfig: { displayLabels: ['kode_satker', 'nama_satker'], searchFields: 'kode_satker,nama_satker' },
    deleteModalLabels: ['nama_satker'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

