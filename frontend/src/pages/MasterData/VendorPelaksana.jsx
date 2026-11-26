import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  nama_vendor: { type: 'string', label: 'Nama Vendor Rekanan', required: true },
  npwp: { type: 'string', label: 'NPWP' },
  telepon: { type: 'phone', label: 'Telepon', required: true },
  alamat: { type: 'textarea', label: 'Alamat Perusahaan' },
  status_vendor: {
    type: 'select',
    label: 'Status Vendor',
    required: true,
    defaultValue: 'Aktif',
    options: [
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Nonaktif', label: 'Nonaktif' },
      { value: 'Ditangguhkan', label: 'Ditangguhkan' },
    ],
  },
};

export default function VendorPelaksanaPage() {
  const config = {
    entity: 'vendor',
    PANEL_TITLE: 'Vendor Pelaksana',
    DATATABLE_TITLE: 'Daftar Vendor Rekanan Pemeliharaan',
    ADD_NEW_ENTITY: 'Tambah Vendor',
    ENTITY_NAME: 'vendor',
    fields,
    searchConfig: { displayLabels: ['nama_vendor'], searchFields: 'nama_vendor' },
    deleteModalLabels: ['nama_vendor'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

