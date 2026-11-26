const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

async function logActivity(idUser, aktivitas, req) {
  try {
    const pool = await getPool();
    const ip = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
    await pool.query(
      'INSERT INTO log_aktivitas_sistem (id_user, aktivitas, ip_address) VALUES (?, ?, ?)',
      [idUser || null, aktivitas, ip]
    );
  } catch {
    // Non-blocking audit log
  }
}

async function loginHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, result: null, message: 'Email dan kata sandi wajib diisi.' });
  }

  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT u.*, r.kode_role, r.nama_role
     FROM users u
     JOIN roles r ON u.id_role = r.id_role
     WHERE u.email = ? AND u.removed = 0 LIMIT 1`,
    [email.trim().toLowerCase()]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, result: null, message: 'Akun tidak ditemukan.' });
  }

  const user = rows[0];
  if (!user.enabled || user.status !== 'Aktif') {
    return res.status(403).json({ success: false, result: null, message: 'Akun dinonaktifkan.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(403).json({ success: false, result: null, message: 'Kata sandi salah.' });
  }

  const token = jwt.sign(
    { id: user.id_user, role: user.kode_role },
    process.env.JWT_SECRET || 'sim_aset_secret',
    { expiresIn: req.body.remember ? '365d' : '24h' }
  );

  await logActivity(user.id_user, `Login Sistem (${user.nama_role})`, req);

  return res.status(200).json({
    success: true,
    result: {
      _id: user.id_user,
      name: user.nama,
      surname: '',
      role: user.kode_role,
      roleName: user.nama_role,
      email: user.email,
      photo: user.photo,
      token,
      maxAge: req.body.remember ? 365 : null,
    },
    message: 'Berhasil masuk ke SIM-ASET BID TIK POLDA DIY',
  });
}

async function logoutHandler(req, res) {
  await logActivity(req.user?.id_user, 'Logout Sistem', req);
  return res.status(200).json({ success: true, result: {}, message: 'Berhasil keluar.' });
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, result: null, message: 'Token autentikasi tidak ditemukan.', jwtExpired: true });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sim_aset_secret');
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id_user, u.id_role, u.nama, u.email, u.photo, u.status, u.enabled, r.kode_role, r.nama_role
       FROM users u JOIN roles r ON u.id_role = r.id_role
       WHERE u.id_user = ? AND u.removed = 0 LIMIT 1`,
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, result: null, message: 'Pengguna tidak valid.', jwtExpired: true });
    }
    req.user = rows[0];
    req.admin = { _id: rows[0].id_user, ...rows[0] };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, result: null, message: err.message, jwtExpired: true });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.user?.kode_role;
    if (!role) return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    if (role === 'admin_subbagrenmin' || allowedRoles.includes(role)) return next();
    return res.status(403).json({ success: false, message: `Peran ${req.user?.nama_role} tidak memiliki akses ke fitur ini.` });
  };
}

module.exports = { loginHandler, logoutHandler, requireAuth, requireRole, logActivity };

