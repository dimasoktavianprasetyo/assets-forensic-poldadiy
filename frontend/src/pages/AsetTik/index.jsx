import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

export default function AsetTikPage() {
  const config = {
    entity: 'aset',
    PANEL_TITLE: 'Inventaris Aset TIK',
    DATATABLE_TITLE: 'Daftar Aset TIK & Depresiasi Garis Lurus',
    ADD_NEW_ENTITY: 'Tambah Aset TIK',
    ENTITY_NAME: 'aset',
    fields,
    searchConfig: {
      displayLabels: ['kode_bmn', 'nama_perangkat', 'merk_tipe'],
      searchFields: 'kode_bmn,nama_perangkat,merk_tipe',
    },
    deleteModalLabels: ['kode_bmn', 'nama_perangkat'],
  };

  return (
    <CrudModule
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} isUpdateForm />}
      config={config}
    />
  );
}

