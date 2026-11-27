import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const fields = {
  nrp: { type: 'string', label: 'NRP / NIP', required: true },
  nama_lengkap: { type: 'string', label: 'Nama Lengkap', required: true },
  pangkat: {
    type: 'select',
    label: 'Pangkat / Golongan',
    showSearch: true,
    options: [
      // Anggota Polri (Tamtama - Perwira Menengah, lengkap tanpa singkatan)
      { value: 'BHAYANGKARA DUA', label: 'Polri - BHAYANGKARA DUA' },
      { value: 'BHAYANGKARA SATU', label: 'Polri - BHAYANGKARA SATU' },
      { value: 'BHAYANGKARA KEPALA', label: 'Polri - BHAYANGKARA KEPALA' },
      { value: 'AJUN BRIGADIR POLISI DUA', label: 'Polri - AJUN BRIGADIR POLISI DUA' },
      { value: 'AJUN BRIGADIR POLISI SATU', label: 'Polri - AJUN BRIGADIR POLISI SATU' },
      { value: 'AJUN BRIGADIR POLISI', label: 'Polri - AJUN BRIGADIR POLISI' },
      { value: 'BRIGADIR POLISI DUA', label: 'Polri - BRIGADIR POLISI DUA' },
      { value: 'BRIGADIR POLISI SATU', label: 'Polri - BRIGADIR POLISI SATU' },
      { value: 'BRIGADIR POLISI', label: 'Polri - BRIGADIR POLISI' },
      { value: 'BRIGADIR POLISI KEPALA', label: 'Polri - BRIGADIR POLISI KEPALA' },
      { value: 'AJUN INSPEKTUR POLISI DUA', label: 'Polri - AJUN INSPEKTUR POLISI DUA' },
      { value: 'AJUN INSPEKTUR POLISI SATU', label: 'Polri - AJUN INSPEKTUR POLISI SATU' },
      { value: 'INSPEKTUR POLISI DUA', label: 'Polri - INSPEKTUR POLISI DUA' },
      { value: 'INSPEKTUR POLISI SATU', label: 'Polri - INSPEKTUR POLISI SATU' },
      { value: 'AJUN KOMISARIS POLISI', label: 'Polri - AJUN KOMISARIS POLISI' },
      { value: 'KOMISARIS POLISI', label: 'Polri - KOMISARIS POLISI' },
      { value: 'AJUN KOMISARIS BESAR POLISI', label: 'Polri - AJUN KOMISARIS BESAR POLISI' },
      { value: 'KOMISARIS BESAR POLISI', label: 'Polri - KOMISARIS BESAR POLISI' },
      // PNS Polri (Golongan I - IV)
      { value: 'JURU MUDA (I/a)', label: 'PNS Polri - JURU MUDA (I/a)' },
      { value: 'JURU MUDA TINGKAT I (I/b)', label: 'PNS Polri - JURU MUDA TINGKAT I (I/b)' },
      { value: 'JURU (I/c)', label: 'PNS Polri - JURU (I/c)' },
      { value: 'JURU TINGKAT I (I/d)', label: 'PNS Polri - JURU TINGKAT I (I/d)' },
      { value: 'PENGATUR MUDA (II/a)', label: 'PNS Polri - PENGATUR MUDA (II/a)' },
      { value: 'PENGATUR MUDA TINGKAT I (II/b)', label: 'PNS Polri - PENGATUR MUDA TINGKAT I (II/b)' },
      { value: 'PENGATUR (II/c)', label: 'PNS Polri - PENGATUR (II/c)' },
      { value: 'PENGATUR TINGKAT I (II/d)', label: 'PNS Polri - PENGATUR TINGKAT I (II/d)' },
      { value: 'PENATA MUDA (III/a)', label: 'PNS Polri - PENATA MUDA (III/a)' },
      { value: 'PENATA MUDA TINGKAT I (III/b)', label: 'PNS Polri - PENATA MUDA TINGKAT I (III/b)' },
      { value: 'PENATA (III/c)', label: 'PNS Polri - PENATA (III/c)' },
      { value: 'PENATA TINGKAT I (III/d)', label: 'PNS Polri - PENATA TINGKAT I (III/d)' },
      { value: 'PEMBINA (IV/a)', label: 'PNS Polri - PEMBINA (IV/a)' },
      { value: 'PEMBINA TINGKAT I (IV/b)', label: 'PNS Polri - PEMBINA TINGKAT I (IV/b)' },
      { value: 'PEMBINA UTAMA MUDA (IV/c)', label: 'PNS Polri - PEMBINA UTAMA MUDA (IV/c)' },
      { value: 'PEMBINA UTAMA MADYA (IV/d)', label: 'PNS Polri - PEMBINA UTAMA MADYA (IV/d)' },
      { value: 'PEMBINA UTAMA (IV/e)', label: 'PNS Polri - PEMBINA UTAMA (IV/e)' },
    ],
  },
  jabatan: { type: 'string', label: 'Jabatan' },
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

