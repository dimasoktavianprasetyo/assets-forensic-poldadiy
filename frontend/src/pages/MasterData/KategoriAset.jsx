import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  kode_kategori: { type: 'string', label: 'Kode Kategori BMN', required: true },
  nama_kategori: { type: 'string', label: 'Nama Kategori', required: true },
  masa_manfaat_default: { type: 'number', label: 'Masa Manfaat (Tahun)', required: true },
  keterangan: { type: 'textarea', label: 'Keterangan' },
};

export default function KategoriAsetPage() {
  const config = {
    entity: 'kategori',
    PANEL_TITLE: 'Kategori Aset BMN',
    DATATABLE_TITLE: 'Daftar Kategori & Sub-Kategori Aset TIK',
    ADD_NEW_ENTITY: 'Tambah Kategori',
    ENTITY_NAME: 'kategori',
    fields,
    searchConfig: { displayLabels: ['kode_kategori', 'nama_kategori'], searchFields: 'kode_kategori,nama_kategori' },
    filterFields: [{ key: 'masa_manfaat_default', label: 'Masa Manfaat (Tahun)' }],
    deleteModalLabels: ['nama_kategori'],
  };
  return <CrudModule createForm={<DynamicForm fields={fields} />} updateForm={<DynamicForm fields={fields} isUpdateForm />} config={config} />;
}

