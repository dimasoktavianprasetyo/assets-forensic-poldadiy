const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { computeBookValue } = require('../services/kmeansOrchestrator');
const { logActivity } = require('../middlewares/bmnAuth');

const ENTITY_CONFIG = {
  satker: {
    table: 'satuan_kerja',
    pk: 'id_satker',
    fields: ['kode_satker', 'nama_satker', 'pimpinan_satker', 'telepon'],
    searchFields: ['kode_satker', 'nama_satker', 'pimpinan_satker'],
    hasRemoved: true,
  },
  personel: {
    table: 'personel',
    pk: 'id_personel',
    fields: ['id_satker', 'satker', 'nrp', 'nama_lengkap', 'pangkat', 'jabatan', 'telepon'],
    searchFields: ['nrp', 'nama_lengkap', 'satker'],
    hasRemoved: true,
  },
  kategori: {
    table: 'kategori_aset',
    pk: 'id_kategori',
    fields: ['kode_kategori', 'nama_kategori', 'masa_manfaat_default', 'keterangan'],
    searchFields: ['kode_kategori', 'nama_kategori'],
    hasRemoved: true,
  },
  lokasi: {
    table: 'lokasi_penempatan',
    pk: 'id_lokasi',
    fields: ['kode_ruangan', 'nama_ruangan', 'gedung', 'lantai', 'penanggung_jawab'],
    searchFields: ['kode_ruangan', 'nama_ruangan', 'gedung'],
    hasRemoved: true,
  },
  vendor: {
    table: 'vendor_pelaksana',
    pk: 'id_vendor',
    fields: ['nama_vendor', 'npwp', 'telepon', 'alamat', 'status_vendor'],
    searchFields: ['nama_vendor', 'npwp'],
    hasRemoved: true,
  },
  aset: {
    table: 'aset_tik',
    pk: 'id_aset',
    fields: [
      'kode_bmn', 'nup', 'nama_perangkat', 'id_kategori', 'id_sub_kategori',
      'id_lokasi', 'merk_tipe', 'no_seri', 'tgl_perolehan', 'nilai_perolehan',
      'masa_manfaat_thn', 'kondisi', 'status_operasional',
    ],
    searchFields: ['kode_bmn', 'nama_perangkat', 'merk_tipe'],
    hasRemoved: true,
  },
  sirkulasi: {
    table: 'sirkulasi_peminjaman',
    pk: 'id_pinjam',
    fields: [
      'no_bast', 'jenis_sirkulasi', 'no_surat_perintah', 'id_personel', 'peminjam_satker',
      'id_petugas', 'kode_bmn', 'tgl_pinjam', 'tgl_kembali_rencana', 'tgl_kembali_aktual',
      'kondisi_keluar', 'kondisi_kembali', 'status_pinjam', 'keperluan_dinas',
    ],
    searchFields: ['no_bast', 'no_surat_perintah', 'kode_bmn', 'peminjam_satker'],
    hasRemoved: true,
  },
  pemeliharaan: {
    table: 'pemeliharaan_aset',
    pk: 'id_servis',
    fields: [
      'no_tiket', 'id_aset', 'kode_bmn', 'id_vendor', 'vendor', 'id_petugas',
      'jenis_kerusakan', 'no_spk', 'status_qc', 'total_biaya', 'status_verifikasi',
      'tgl_lapor', 'tgl_selesai',
    ],
    searchFields: ['no_tiket', 'kode_bmn', 'jenis_kerusakan', 'no_spk'],
    hasRemoved: true,
  },
  rekonsiliasi: {
    table: 'rekonsiliasi_bmn',
    pk: 'id_rekon',
    fields: ['no_bar', 'periode', 'tahun', 'id_satker', 'satker', 'status_rekon', 'catatan', 'tgl_rekon'],
    searchFields: ['no_bar', 'satker', 'periode'],
    hasRemoved: true,
  },
};

function mapRow(entity, row) {
  const cfg = ENTITY_CONFIG[entity];
  const out = { _id: row[cfg.pk], ...row };
  if (entity === 'aset') {
    const { bookValue, annualDep, accumDep } = computeBookValue(
      row.nilai_perolehan,
      row.masa_manfaat_thn,
      row.tgl_perolehan
    );
    out.nilai_buku = Math.round(bookValue);
    out.penyusutan_tahunan = Math.round(annualDep);
    out.akumulasi_penyusutan = Math.round(accumDep);
  }
  return out;
}

function normalizeDateField(val) {
  if (!val) return null;
  if (typeof val === 'string' && val.includes('T')) return val.slice(0, 10);
  return val;
}

async function listEntity(req, res) {
  const { entity } = req.params;
  if (entity === 'users') return listUsers(req, res);
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return res.status(404).json({ success: false, message: 'Entitas tidak dikenal' });

  const pool = await getPool();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.items, 10) || 10);
  const offset = (page - 1) * limit;
  const q = (req.query.q || '').trim();

  let where = cfg.hasRemoved ? 'WHERE removed = 0' : 'WHERE 1=1';
  const params = [];
  if (q && cfg.searchFields.length) {
    const likes = cfg.searchFields.map((f) => `${f} LIKE ?`).join(' OR ');
    where += ` AND (${likes})`;
    cfg.searchFields.forEach(() => params.push(`%${q}%`));
  }

  const [rows] = await pool.query(
    `SELECT * FROM ${cfg.table} ${where} ORDER BY ${cfg.pk} DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM ${cfg.table} ${where}`, params);
  const count = cnt[0].total;
  const pages = Math.ceil(count / limit);

  return res.status(count > 0 ? 200 : 203).json({
    success: true,
    result: rows.map((r) => mapRow(entity, r)),
    pagination: { page, pages, count },
    message: count > 0 ? 'Data berhasil dimuat' : 'Belum ada data',
  });
}

async function searchEntity(req, res) {
  const { entity } = req.params;
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return res.status(404).json({ success: false, message: 'Entitas tidak dikenal' });
  const pool = await getPool();
  const q = (req.query.q || '').trim();
  const likes = cfg.searchFields.map((f) => `${f} LIKE ?`).join(' OR ');
  const params = cfg.searchFields.map(() => `%${q}%`);
  const [rows] = await pool.query(
    `SELECT * FROM ${cfg.table} WHERE removed = 0 AND (${likes}) LIMIT 20`,
    params
  );
  return res.status(200).json({
    success: true,
    result: rows.map((r) => mapRow(entity, r)),
    message: 'Hasil pencarian ditemukan',
  });
}

async function readEntity(req, res) {
  const { entity, id } = req.params;
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return res.status(404).json({ success: false, message: 'Entitas tidak dikenal' });
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT * FROM ${cfg.table} WHERE ${cfg.pk} = ? AND removed = 0 LIMIT 1`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ success: false, result: null, message: 'Data tidak ditemukan' });
  return res.status(200).json({ success: true, result: mapRow(entity, rows[0]) });
}

async function createEntity(req, res) {
  const { entity } = req.params;
  if (entity === 'users') return createUser(req, res);
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return res.status(404).json({ success: false, message: 'Entitas tidak dikenal' });

  const pool = await getPool();
  const cols = [];
  const vals = [];
  for (const f of cfg.fields) {
    if (req.body[f] !== undefined) {
      cols.push(f);
      vals.push(f.startsWith('tgl_') ? normalizeDateField(req.body[f]) : req.body[f]);
    }
  }
  const ph = cols.map(() => '?').join(', ');
  const [ins] = await pool.query(`INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${ph})`, vals);
  const [rows] = await pool.query(`SELECT * FROM ${cfg.table} WHERE ${cfg.pk} = ?`, [ins.insertId]);

  await logActivity(req.user?.id_user, `Tambah data ${entity} (#${ins.insertId})`, req);
  return res.status(200).json({ success: true, result: mapRow(entity, rows[0]), message: 'Data berhasil ditambahkan' });
}

async function updateEntity(req, res) {
  const { entity, id } = req.params;
  if (entity === 'users') return updateUser(req, res);
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return res.status(404).json({ success: false, message: 'Entitas tidak dikenal' });

  const pool = await getPool();
  const sets = [];
  const vals = [];
  for (const f of cfg.fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(f.startsWith('tgl_') ? normalizeDateField(req.body[f]) : req.body[f]);
    }
  }
  if (!sets.length) return res.status(400).json({ success: false, message: 'Tidak ada field diubah' });
  vals.push(id);
  await pool.query(`UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE ${cfg.pk} = ?`, vals);
  const [rows] = await pool.query(`SELECT * FROM ${cfg.table} WHERE ${cfg.pk} = ?`, [id]);

  await logActivity(req.user?.id_user, `Ubah data ${entity} (#${id})`, req);
  return res.status(200).json({ success: true, result: mapRow(entity, rows[0]), message: 'Data berhasil diperbarui' });
}

async function deleteEntity(req, res) {
  const { entity, id } = req.params;
  if (entity === 'users') return deleteUser(req, res);
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return res.status(404).json({ success: false, message: 'Entitas tidak dikenal' });
  const pool = await getPool();
  await pool.query(`UPDATE ${cfg.table} SET removed = 1 WHERE ${cfg.pk} = ?`, [id]);
  await logActivity(req.user?.id_user, `Hapus data ${entity} (#${id})`, req);
  return res.status(200).json({ success: true, result: { _id: id }, message: 'Data berhasil dihapus' });
}

// CRUD Khusus Users + Roles
async function listUsers(req, res) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT u.id_user AS _id, u.nama, u.email, r.kode_role AS role, r.nama_role, u.status, u.created_at
     FROM users u JOIN roles r ON u.id_role = r.id_role WHERE u.removed = 0 ORDER BY u.id_user DESC`
  );
  return res.status(200).json({ success: true, result: rows });
}

async function createUser(req, res) {
  const { nama, email, password, role, status = 'Aktif' } = req.body;
  const pool = await getPool();
  const [rRows] = await pool.query('SELECT id_role FROM roles WHERE kode_role = ? LIMIT 1', [role || 'operator_teknisi']);
  const idRole = rRows[0]?.id_role || 2;
  const hash = bcrypt.hashSync(password || 'admin123', 10);
  const [ins] = await pool.query(
    'INSERT INTO users (id_role, nama, email, password_hash, status, enabled) VALUES (?, ?, ?, ?, ?, ?)',
    [idRole, nama, email.trim().toLowerCase(), hash, status, status === 'Aktif' ? 1 : 0]
  );
  await logActivity(req.user?.id_user, `Tambah user baru: ${email} (${role})`, req);
  return res.status(200).json({ success: true, result: { _id: ins.insertId, nama, email, role, status } });
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { nama, email, password, role, status } = req.body;
  const pool = await getPool();
  const [rRows] = await pool.query('SELECT id_role FROM roles WHERE kode_role = ? LIMIT 1', [role]);
  const idRole = rRows[0]?.id_role;
  const sets = [];
  const vals = [];
  if (nama) { sets.push('nama = ?'); vals.push(nama); }
  if (email) { sets.push('email = ?'); vals.push(email.trim().toLowerCase()); }
  if (idRole) { sets.push('id_role = ?'); vals.push(idRole); }
  if (status) { sets.push('status = ?, enabled = ?'); vals.push(status, status === 'Aktif' ? 1 : 0); }
  if (password && password.trim()) { sets.push('password_hash = ?'); vals.push(bcrypt.hashSync(password, 10)); }
  if (sets.length) {
    vals.push(id);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id_user = ?`, vals);
  }
  await logActivity(req.user?.id_user, `Ubah data/role user #${id}`, req);
  return res.status(200).json({ success: true, result: { _id: id, nama, email, role, status } });
}

async function deleteUser(req, res) {
  const { id } = req.params;
  const pool = await getPool();
  await pool.query('UPDATE users SET removed = 1, enabled = 0 WHERE id_user = ?', [id]);
  await logActivity(req.user?.id_user, `Hapus user #${id}`, req);
  return res.status(200).json({ success: true, result: { _id: id } });
}

module.exports = {
  ENTITY_CONFIG,
  listEntity,
  searchEntity,
  readEntity,
  createEntity,
  updateEntity,
  deleteEntity,
};

