export const fields = {
  kode_bmn: { type: 'string', label: 'Kode BMN', required: true },
  nup: { type: 'string', label: 'NUP', required: true },
  nama_perangkat: { type: 'string', label: 'Nama Perangkat TIK', required: true },
  merk_tipe: { type: 'string', label: 'Merk / Tipe', required: true },
  no_seri: { type: 'string', label: 'No. Seri (Masked)', disableForTable: true },
  tgl_perolehan: { type: 'date', label: 'Tgl Perolehan', required: true },
  nilai_perolehan: { type: 'number', label: 'Nilai Perolehan (Rp)', required: true },
  masa_manfaat_thn: { type: 'number', label: 'Masa Manfaat (Thn)', required: true },
  nilai_buku: { type: 'number', label: 'Nilai Buku Saat Ini (Rp)', disableForForm: true },
  kondisi: {
    type: 'selectWithTranslation',
    label: 'Kondisi BMN',
    required: true,
    defaultValue: 'Baik',
    options: [
      { value: 'Baik', label: 'Baik', color: '#389e0d' },
      { value: 'RR', label: 'Rusak Ringan (RR)', color: '#d48806' },
      { value: 'RB', label: 'Rusak Berat (RB)', color: '#cf1322' },
    ],
  },
  status_operasional: {
    type: 'selectWithTranslation',
    label: 'Status Operasional',
    required: true,
    defaultValue: 'Tersedia',
    options: [
      { value: 'Tersedia', label: 'Tersedia', color: '#0958d9' },
      { value: 'Dipinjam', label: 'Dipinjam', color: '#d48806' },
      { value: 'Dalam Servis', label: 'Dalam Servis', color: '#531dab' },
      { value: 'Usul Hapus', label: 'Usul Hapus', color: '#cf1322' },
    ],
  },
};

