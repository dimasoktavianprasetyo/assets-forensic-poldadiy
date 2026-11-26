/**
 * MySQL Relational Adapter (3NF Normalized Schema)
 * Mengubungkan model aplikasi ke database MySQL (RDBMS) tanpa kolom JSON mentah (_doc).
 * Mendukung relasi Foreign Key antar tabel (admins, admin_passwords, settings, clients, invoices, invoice_items, payments, uploads).
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const Module = require('module');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

const newId = () => crypto.randomBytes(12).toString('hex');
const idOf = (v) => (v && typeof v === 'object' ? String(v._id || v.id || '') : v ? String(v) : null);

function checkPort(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (ok) => { s.destroy(); resolve(ok); };
    s.setTimeout(timeout);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
    s.connect(port, host);
  });
}

async function autoStartXamppMysql(host, port) {
  if (await checkPort(host, port)) return;
  const bin = 'C:\\xampp\\mysql\\bin\\mysqld.exe';
  const ini = 'C:\\xampp\\mysql\\bin\\my.ini';
  if (fs.existsSync(bin)) {
    spawn(bin, [`--defaults-file=${ini}`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkPort(host, port)) return;
    }
  }
}

// DDL Tabel Relasional 3NF (Tanpa kolom _doc) + Foreign Keys untuk ERD phpMyAdmin
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS admins (
    _id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) DEFAULT NULL,
    photo VARCHAR(500) DEFAULT NULL,
    role VARCHAR(50) DEFAULT 'owner',
    enabled TINYINT(1) DEFAULT 1,
    removed TINYINT(1) DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS admin_passwords (
    _id VARCHAR(36) PRIMARY KEY,
    user VARCHAR(36) NOT NULL,
    password VARCHAR(255) NOT NULL,
    salt VARCHAR(100) NOT NULL,
    emailToken VARCHAR(255) DEFAULT NULL,
    resetToken VARCHAR(255) DEFAULT NULL,
    emailVerified TINYINT(1) DEFAULT 1,
    authType VARCHAR(50) DEFAULT 'email',
    loggedSessions TEXT DEFAULT NULL,
    removed TINYINT(1) DEFAULT 0,
    INDEX idx_user (user),
    CONSTRAINT fk_admin_passwords_user FOREIGN KEY (user) REFERENCES admins(_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS settings (
    _id VARCHAR(36) PRIMARY KEY,
    settingCategory VARCHAR(100) NOT NULL,
    settingKey VARCHAR(100) NOT NULL,
    settingValue TEXT DEFAULT NULL,
    valueType VARCHAR(50) DEFAULT 'string',
    isPrivate TINYINT(1) DEFAULT 0,
    isCoreSetting TINYINT(1) DEFAULT 0,
    enabled TINYINT(1) DEFAULT 1,
    removed TINYINT(1) DEFAULT 0,
    INDEX idx_setting_key (settingKey),
    INDEX idx_setting_cat (settingCategory)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS clients (
    _id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(100) DEFAULT NULL,
    country VARCHAR(100) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    createdBy VARCHAR(36) DEFAULT NULL,
    assigned VARCHAR(36) DEFAULT NULL,
    enabled TINYINT(1) DEFAULT 1,
    removed TINYINT(1) DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_name (name),
    CONSTRAINT fk_clients_created_by FOREIGN KEY (createdBy) REFERENCES admins(_id) ON DELETE SET NULL,
    CONSTRAINT fk_clients_assigned FOREIGN KEY (assigned) REFERENCES admins(_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS invoices (
    _id VARCHAR(36) PRIMARY KEY,
    number INT NOT NULL,
    year INT NOT NULL,
    client VARCHAR(36) NOT NULL,
    createdBy VARCHAR(36) DEFAULT NULL,
    date DATETIME NOT NULL,
    expiredDate DATETIME NOT NULL,
    recurring VARCHAR(50) DEFAULT NULL,
    subTotal DECIMAL(15,2) DEFAULT 0,
    taxRate DECIMAL(10,4) DEFAULT 0,
    taxTotal DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(20) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft',
    paymentStatus VARCHAR(50) DEFAULT 'unpaid',
    isOverdue TINYINT(1) DEFAULT 0,
    approved TINYINT(1) DEFAULT 0,
    notes TEXT DEFAULT NULL,
    pdf VARCHAR(255) DEFAULT NULL,
    removed TINYINT(1) DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invoice_client (client),
    INDEX idx_invoice_status (status),
    INDEX idx_invoice_payment_status (paymentStatus),
    CONSTRAINT fk_invoices_client FOREIGN KEY (client) REFERENCES clients(_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_created_by FOREIGN KEY (createdBy) REFERENCES admins(_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL,
    itemName VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    INDEX idx_item_invoice (invoice_id),
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS payments (
    _id VARCHAR(36) PRIMARY KEY,
    number INT NOT NULL,
    client VARCHAR(36) NOT NULL,
    invoice VARCHAR(36) NOT NULL,
    createdBy VARCHAR(36) DEFAULT NULL,
    date DATETIME NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(20) DEFAULT 'USD',
    ref VARCHAR(100) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    pdf VARCHAR(255) DEFAULT NULL,
    removed TINYINT(1) DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payment_client (client),
    INDEX idx_payment_invoice (invoice),
    CONSTRAINT fk_payments_client FOREIGN KEY (client) REFERENCES clients(_id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice) REFERENCES invoices(_id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_created_by FOREIGN KEY (createdBy) REFERENCES admins(_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS uploads (
    _id VARCHAR(36) PRIMARY KEY,
    fileName VARCHAR(255) DEFAULT NULL,
    fieldExt VARCHAR(50) DEFAULT NULL,
    entity VARCHAR(100) DEFAULT NULL,
    fieldName VARCHAR(100) DEFAULT NULL,
    fileType VARCHAR(50) DEFAULT NULL,
    filePath VARCHAR(500) DEFAULT NULL,
    userID VARCHAR(36) DEFAULT NULL,
    isPublic TINYINT(1) DEFAULT 1,
    removed TINYINT(1) DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

// Konversi Baris SQL <-> Objek Model JS (Tanpa kolom _doc)
const MAPPERS = {
  Admin: {
    table: 'admins',
    toRow: (d) => ({
      _id: String(d._id),
      email: d.email || '',
      name: d.name || '',
      surname: d.surname || null,
      photo: d.photo || null,
      role: d.role || 'owner',
      enabled: d.enabled ? 1 : 0,
      removed: d.removed ? 1 : 0,
      created: d.created ? new Date(d.created) : new Date(),
    }),
    fromRow: (r) => ({
      _id: r._id,
      email: r.email,
      name: r.name,
      surname: r.surname,
      photo: r.photo,
      role: r.role,
      enabled: Boolean(r.enabled),
      removed: Boolean(r.removed),
      created: r.created ? new Date(r.created) : new Date(),
    }),
  },
  AdminPassword: {
    table: 'admin_passwords',
    toRow: (d) => ({
      _id: String(d._id),
      user: idOf(d.user) || '',
      password: d.password || '',
      salt: d.salt || '',
      emailToken: d.emailToken || null,
      resetToken: d.resetToken || null,
      emailVerified: d.emailVerified ? 1 : 0,
      authType: d.authType || 'email',
      loggedSessions: JSON.stringify(Array.isArray(d.loggedSessions) ? d.loggedSessions : []),
      removed: d.removed ? 1 : 0,
    }),
    fromRow: (r) => ({
      _id: r._id,
      user: r.user,
      password: r.password,
      salt: r.salt,
      emailToken: r.emailToken,
      resetToken: r.resetToken,
      emailVerified: Boolean(r.emailVerified),
      authType: r.authType || 'email',
      loggedSessions: JSON.parse(r.loggedSessions || '[]'),
      removed: Boolean(r.removed),
    }),
  },
  Setting: {
    table: 'settings',
    toRow: (d) => ({
      _id: String(d._id),
      settingCategory: (d.settingCategory || '').toLowerCase(),
      settingKey: (d.settingKey || '').toLowerCase(),
      settingValue: typeof d.settingValue === 'object' ? JSON.stringify(d.settingValue) : String(d.settingValue ?? ''),
      valueType: d.valueType || 'string',
      isPrivate: d.isPrivate ? 1 : 0,
      isCoreSetting: d.isCoreSetting ? 1 : 0,
      enabled: d.enabled !== false ? 1 : 0,
      removed: d.removed ? 1 : 0,
    }),
    fromRow: (r) => {
      let val = r.settingValue;
      const vt = (r.valueType || '').toLowerCase();
      if (vt === 'boolean') val = val === 'true' || val === '1';
      else if (vt === 'number') val = Number(val || 0);
      else if (vt === 'array' || vt === 'object') {
        try { val = JSON.parse(val || '[]'); } catch { val = []; }
      }
      return {
        _id: r._id,
        settingCategory: r.settingCategory,
        settingKey: r.settingKey,
        settingValue: val,
        valueType: r.valueType,
        isPrivate: Boolean(r.isPrivate),
        isCoreSetting: Boolean(r.isCoreSetting),
        enabled: Boolean(r.enabled),
        removed: Boolean(r.removed),
      };
    },
  },
  Client: {
    table: 'clients',
    toRow: (d) => ({
      _id: String(d._id),
      name: d.name || '',
      phone: d.phone || null,
      country: d.country || null,
      address: d.address || null,
      email: d.email || null,
      createdBy: idOf(d.createdBy),
      assigned: idOf(d.assigned),
      enabled: d.enabled !== false ? 1 : 0,
      removed: d.removed ? 1 : 0,
      created: d.created ? new Date(d.created) : new Date(),
      updated: d.updated ? new Date(d.updated) : new Date(),
    }),
    fromRow: (r) => ({
      _id: r._id,
      name: r.name,
      phone: r.phone,
      country: r.country,
      address: r.address,
      email: r.email,
      createdBy: r.createdBy,
      assigned: r.assigned,
      enabled: Boolean(r.enabled),
      removed: Boolean(r.removed),
      created: r.created ? new Date(r.created) : new Date(),
      updated: r.updated ? new Date(r.updated) : new Date(),
    }),
  },
  Invoice: {
    table: 'invoices',
    toRow: (d) => ({
      _id: String(d._id),
      number: Number(d.number || 1),
      year: Number(d.year || new Date().getFullYear()),
      client: idOf(d.client) || '',
      createdBy: idOf(d.createdBy),
      date: d.date ? new Date(d.date) : new Date(),
      expiredDate: d.expiredDate ? new Date(d.expiredDate) : new Date(),
      recurring: d.recurring || null,
      subTotal: Number(d.subTotal || 0),
      taxRate: Number(d.taxRate || 0),
      taxTotal: Number(d.taxTotal || 0),
      total: Number(d.total || 0),
      credit: Number(d.credit || 0),
      discount: Number(d.discount || 0),
      currency: d.currency || 'USD',
      status: d.status || 'draft',
      paymentStatus: d.paymentStatus || 'unpaid',
      isOverdue: d.isOverdue ? 1 : 0,
      approved: d.approved ? 1 : 0,
      notes: d.notes || null,
      pdf: d.pdf || null,
      removed: d.removed ? 1 : 0,
      created: d.created ? new Date(d.created) : new Date(),
      updated: d.updated ? new Date(d.updated) : new Date(),
    }),
    fromRow: (r) => ({
      _id: r._id,
      number: Number(r.number),
      year: Number(r.year),
      client: r.client,
      createdBy: r.createdBy,
      date: r.date ? new Date(r.date) : new Date(),
      expiredDate: r.expiredDate ? new Date(r.expiredDate) : new Date(),
      recurring: r.recurring || undefined,
      items: [],
      payment: [],
      subTotal: Number(r.subTotal || 0),
      taxRate: Number(r.taxRate || 0),
      taxTotal: Number(r.taxTotal || 0),
      total: Number(r.total || 0),
      credit: Number(r.credit || 0),
      discount: Number(r.discount || 0),
      currency: r.currency || 'USD',
      status: r.status || 'draft',
      paymentStatus: r.paymentStatus || 'unpaid',
      isOverdue: Boolean(r.isOverdue),
      approved: Boolean(r.approved),
      notes: r.notes,
      pdf: r.pdf,
      files: [],
      removed: Boolean(r.removed),
      created: r.created ? new Date(r.created) : new Date(),
      updated: r.updated ? new Date(r.updated) : new Date(),
    }),
  },
  Payment: {
    table: 'payments',
    toRow: (d) => ({
      _id: String(d._id),
      number: Number(d.number || 1),
      client: idOf(d.client) || '',
      invoice: idOf(d.invoice) || '',
      createdBy: idOf(d.createdBy),
      date: d.date ? new Date(d.date) : new Date(),
      amount: Number(d.amount || 0),
      currency: d.currency || 'USD',
      ref: d.ref || null,
      description: d.description || null,
      pdf: d.pdf || null,
      removed: d.removed ? 1 : 0,
      created: d.created ? new Date(d.created) : new Date(),
      updated: d.updated ? new Date(d.updated) : new Date(),
    }),
    fromRow: (r) => ({
      _id: r._id,
      number: Number(r.number),
      client: r.client,
      invoice: r.invoice,
      createdBy: r.createdBy,
      date: r.date ? new Date(r.date) : new Date(),
      amount: Number(r.amount || 0),
      currency: r.currency || 'USD',
      ref: r.ref,
      description: r.description,
      pdf: r.pdf,
      removed: Boolean(r.removed),
      created: r.created ? new Date(r.created) : new Date(),
      updated: r.updated ? new Date(r.updated) : new Date(),
    }),
  },
  Upload: {
    table: 'uploads',
    toRow: (d) => ({
      _id: String(d._id),
      fileName: d.fileName || null,
      fieldExt: d.fieldExt || null,
      entity: d.entity || null,
      fieldName: d.fieldName || null,
      fileType: d.fileType || null,
      filePath: d.filePath || null,
      userID: idOf(d.userID),
      isPublic: d.isPublic !== false ? 1 : 0,
      removed: d.removed ? 1 : 0,
      created: d.created ? new Date(d.created) : new Date(),
    }),
    fromRow: (r) => ({
      _id: r._id,
      fileName: r.fileName,
      fieldExt: r.fieldExt,
      entity: r.entity,
      fieldName: r.fieldName,
      fileType: r.fileType,
      filePath: r.filePath,
      userID: r.userID,
      isPublic: Boolean(r.isPublic),
      removed: Boolean(r.removed),
      created: r.created ? new Date(r.created) : new Date(),
    }),
  },
};

let pool = null;
let initPromise = null;
const models = {};
const store = {
  Admin: new Map(),
  AdminPassword: new Map(),
  Setting: new Map(),
  Client: new Map(),
  Invoice: new Map(),
  Payment: new Map(),
  Upload: new Map(),
};

async function initDB() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const port = Number(process.env.MYSQL_PORT || 3306);
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || 'idurar_erp_crm';

    await autoStartXamppMysql(host, port);

    const conn = await mysql.createConnection({ host, port, user, password });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.end();

    pool = mysql.createPool({ host, port, user, password, database, connectionLimit: 10 });

    for (const ddl of DDL_STATEMENTS) {
      await pool.query(ddl);
    }

    // Muat data dari tabel-tabel relasional MySQL
    for (const [key, cfg] of Object.entries(MAPPERS)) {
      const [rows] = await pool.query(`SELECT * FROM \`${cfg.table}\``);
      store[key].clear();
      for (const r of rows) {
        store[key].set(String(r._id), cfg.fromRow(r));
      }
    }

    // Gabungkan tabel relasi anak `invoice_items` ke `Invoice.items`
    const [itemRows] = await pool.query(`SELECT * FROM invoice_items ORDER BY id ASC`);
    for (const ir of itemRows) {
      const inv = store.Invoice.get(String(ir.invoice_id));
      if (inv) {
        inv.items.push({
          itemName: ir.itemName,
          description: ir.description,
          quantity: Number(ir.quantity),
          price: Number(ir.price),
          total: Number(ir.total),
        });
      }
    }

    // Gabungkan relasi `payments` ke `Invoice.payment`
    for (const pay of store.Payment.values()) {
      if (!pay.removed && pay.invoice) {
        const inv = store.Invoice.get(String(pay.invoice));
        if (inv && !inv.payment.includes(String(pay._id))) {
          inv.payment.push(String(pay._id));
        }
      }
    }

    console.log(`✅ MySQL (3NF Relational) Connected → ${database} (${host}:${port})`);
  })();
  return initPromise;
}

async function upsertRows(modelKey, docs) {
  await initDB();
  if (!docs || docs.length === 0) return;
  const cfg = MAPPERS[modelKey] || MAPPERS.Upload;
  const cols = Object.keys(cfg.toRow(docs[0]));
  const colList = cols.map((c) => `\`${c}\``).join(', ');
  const updateList = cols.filter((c) => c !== '_id').map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(', ');

  const batchSize = 250;
  for (let i = 0; i < docs.length; i += batchSize) {
    const slice = docs.slice(i, i + batchSize);
    const vals = [];
    const ph = slice.map((d) => {
      const r = cfg.toRow(d);
      cols.forEach((c) => vals.push(r[c]));
      return `(${cols.map(() => '?').join(',')})`;
    });
    await pool.query(`INSERT INTO \`${cfg.table}\` (${colList}) VALUES ${ph.join(',')} ON DUPLICATE KEY UPDATE ${updateList}`, vals);
  }

  // Simpan detail barang ke tabel anak `invoice_items`
  if (modelKey === 'Invoice') {
    const invIds = docs.map((d) => String(d._id));
    for (let i = 0; i < invIds.length; i += batchSize) {
      const idSlice = invIds.slice(i, i + batchSize);
      await pool.query(`DELETE FROM invoice_items WHERE invoice_id IN (${idSlice.map(() => '?').join(',')})`, idSlice);
    }
    const allItems = [];
    for (const d of docs) {
      if (Array.isArray(d.items)) {
        for (const it of d.items) {
          allItems.push([String(d._id), it.itemName || '', it.description || null, Number(it.quantity || 1), Number(it.price || 0), Number(it.total || 0)]);
        }
      }
    }
    for (let i = 0; i < allItems.length; i += 500) {
      const slice = allItems.slice(i, i + 500);
      const vals = [];
      const ph = slice.map((row) => { row.forEach((v) => vals.push(v)); return '(?,?,?,?,?,?)'; });
      await pool.query(`INSERT INTO invoice_items (invoice_id, itemName, description, quantity, price, total) VALUES ${ph.join(',')}`, vals);
    }
  }
}

function matches(doc, filter) {
  if (!filter) return true;
  for (const [k, cond] of Object.entries(filter)) {
    if (k === 'undefined' || cond === undefined) continue;
    if (k === '$or') { if (cond.length && !cond.some((c) => matches(doc, c))) return false; continue; }
    if (k === '$and') { if (!cond.every((c) => matches(doc, c))) return false; continue; }

    let val = k.includes('.') ? k.split('.').reduce((o, p) => (o ? o[p] : undefined), doc) : doc[k];
    if (val && typeof val === 'object' && val._id) val = val._id;

    if (cond && typeof cond === 'object' && !(cond instanceof RegExp) && !(cond instanceof Date)) {
      if ('$regex' in cond) {
        const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(String(cond.$regex || ''), cond.$options || 'i');
        if (!re.test(String(val ?? ''))) return false;
        continue;
      }
      if ('$in' in cond) { if (!cond.$in.map(String).includes(String(val))) return false; continue; }
      if ('$gte' in cond || '$lte' in cond || '$lt' in cond || '$gt' in cond) {
        const t = new Date(val).getTime();
        if ('$gte' in cond && !(t >= new Date(cond.$gte).getTime())) return false;
        if ('$lte' in cond && !(t <= new Date(cond.$lte).getTime())) return false;
        if ('$lt' in cond && !(t < new Date(cond.$lt).getTime())) return false;
        if ('$gt' in cond && !(t > new Date(cond.$gt).getTime())) return false;
        continue;
      }
    }
    if (cond instanceof RegExp) { if (!cond.test(String(val ?? ''))) return false; continue; }
    if (typeof val === 'boolean' && typeof cond === 'string') { if (val !== (cond === 'true')) return false; continue; }
    if (String(val) !== String(cond)) return false;
  }
  return true;
}

function hydrate(doc, modelKey, schema) {
  if (!doc) return null;
  const copy = { ...doc };
  Object.defineProperty(copy, 'id', { get() { return String(this._id); }, enumerable: false });
  if (schema?.methods) {
    for (const [m, fn] of Object.entries(schema.methods)) {
      Object.defineProperty(copy, m, { value: fn.bind(copy), enumerable: false });
    }
  }
  if (modelKey === 'Invoice') {
    const cid = idOf(copy.client);
    if (cid && store.Client.has(cid)) copy.client = hydrate(store.Client.get(cid), 'Client');
    const aid = idOf(copy.createdBy);
    if (aid && store.Admin.has(aid)) copy.createdBy = hydrate(store.Admin.get(aid), 'Admin');
  } else if (modelKey === 'Payment') {
    const cid = idOf(copy.client);
    if (cid && store.Client.has(cid)) copy.client = hydrate(store.Client.get(cid), 'Client');
    const iid = idOf(copy.invoice);
    if (iid && store.Invoice.has(iid)) copy.invoice = hydrate(store.Invoice.get(iid), 'Invoice');
    const aid = idOf(copy.createdBy);
    if (aid && store.Admin.has(aid)) copy.createdBy = hydrate(store.Admin.get(aid), 'Admin');
  }
  return copy;
}

function applyUpdate(doc, upd) {
  if (!upd) return;
  for (const [k, v] of Object.entries(upd)) {
    if (k === '$set') Object.assign(doc, v);
    else if (k === '$inc') for (const [ik, iv] of Object.entries(v)) doc[ik] = Number(doc[ik] || 0) + Number(iv);
    else if (k === '$push') for (const [ak, av] of Object.entries(v)) { if (!Array.isArray(doc[ak])) doc[ak] = []; doc[ak].push(av); }
    else if (k === '$pull') for (const [ak, pv] of Object.entries(v)) { if (Array.isArray(doc[ak])) doc[ak] = doc[ak].filter((x) => String(x) !== String(pv)); }
    else if (!k.startsWith('$')) doc[k] = v;
  }
}

class Query {
  constructor(modelKey, schema, op, filter = {}, update = null) {
    Object.assign(this, { modelKey, schema, op, filter: { ...filter }, update, _skip: 0, _limit: null, _sort: null, _wf: null });
  }
  where(f, v) { if (v !== undefined) this.filter[f] = v; else this._wf = f; return this; }
  equals(v) { if (this._wf) { this.filter[this._wf] = v; this._wf = null; } return this; }
  skip(n) { this._skip = Number(n) || 0; return this; }
  limit(n) { this._limit = Number(n) || null; return this; }
  sort(s) { this._sort = s; return this; }
  populate() { return this; }
  lean() { return this; }

  async exec() {
    await initDB();
    const map = store[this.modelKey] || store.Upload;
    const docs = Array.from(map.values());

    if (this.op === 'count') return docs.filter((d) => matches(d, this.filter)).length;
    if (this.op === 'findOne') {
      const d = docs.find((x) => matches(x, this.filter));
      return d ? hydrate(d, this.modelKey, this.schema) : null;
    }
    if (this.op === 'updateOne') {
      const d = docs.find((x) => matches(x, this.filter));
      if (!d) return null;
      applyUpdate(d, this.update);
      d.updated = new Date();
      await upsertRows(this.modelKey, [d]);
      return hydrate(d, this.modelKey, this.schema);
    }

    let list = docs.filter((d) => matches(d, this.filter));
    if (this._sort) {
      const [[f, dirVal]] = Object.entries(this._sort);
      const dir = dirVal === 'asc' || dirVal === 1 || dirVal === '1' ? 1 : -1;
      list.sort((a, b) => ((a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * dir));
    }
    if (this._skip) list = list.slice(this._skip);
    if (this._limit) list = list.slice(0, this._limit);
    return list.map((d) => hydrate(d, this.modelKey, this.schema));
  }
  then(res, rej) { return this.exec().then(res, rej); }
  catch(rej) { return this.exec().catch(rej); }
}

class Schema {
  constructor(def = {}) { this.definition = def; this.methods = {}; }
  plugin() { return this; }
  index() { return this; }
}
Schema.ObjectId = String;
Schema.Types = { ObjectId: String, Mixed: Object };

function buildModel(rawName, schema) {
  const key = rawName.trim();
  if (models[key]) return models[key];
  const cfg = MAPPERS[key] || MAPPERS.Upload;

  function withDefaults(data) {
    const obj = { ...data };
    if (!obj._id) obj._id = newId();
    for (const [f, spec] of Object.entries(schema?.definition || {})) {
      if (obj[f] === undefined && spec && typeof spec === 'object' && 'default' in spec) {
        obj[f] = typeof spec.default === 'function' ? spec.default() : Array.isArray(spec.default) ? [...spec.default] : spec.default;
      }
    }
    if (obj.removed === undefined) obj.removed = false;
    return obj;
  }

  class RelationalModel {
    constructor(data = {}) {
      Object.assign(this, withDefaults(data));
      Object.defineProperty(this, 'id', { get() { return String(this._id); }, enumerable: false });
      for (const [m, fn] of Object.entries(schema?.methods || {})) {
        Object.defineProperty(this, m, { value: fn.bind(this), enumerable: false });
      }
    }
    async save() {
      await initDB();
      const plain = { ...this };
      store[key].set(String(plain._id), plain);
      await upsertRows(key, [plain]);
      return hydrate(plain, key, schema);
    }
    static find(f) { return new Query(key, schema, 'find', f); }
    static findOne(f) { return new Query(key, schema, 'findOne', f); }
    static findById(id) { return new Query(key, schema, 'findOne', { _id: id }); }
    static findOneAndUpdate(f, u) { return new Query(key, schema, 'updateOne', f, u); }
    static findByIdAndUpdate(id, u) { return new Query(key, schema, 'updateOne', { _id: id }, u); }
    static countDocuments(f) { return new Query(key, schema, 'count', f); }
    static create(d) { return new RelationalModel(d).save(); }

    static async insertMany(arr = []) {
      await initDB();
      const docs = arr.map((x) => { const d = withDefaults(x); store[key].set(String(d._id), d); return d; });
      await upsertRows(key, docs);
      return docs.map((d) => hydrate(d, key, schema));
    }
    static async updateMany(f = {}, u = {}) {
      await initDB();
      const mod = [];
      for (const d of store[key].values()) if (matches(d, f)) { applyUpdate(d, u); mod.push(d); }
      await upsertRows(key, mod);
      return { acknowledged: true, modifiedCount: mod.length };
    }
    static async deleteMany(f = {}) {
      await initDB();
      if (!Object.keys(f).length) {
        store[key].clear();
        await pool.query(`DELETE FROM \`${cfg.table}\``);
        return { deletedCount: 0 };
      }
      const ids = [];
      for (const [id, d] of store[key].entries()) if (matches(d, f)) { store[key].delete(id); ids.push(id); }
      if (ids.length) await pool.query(`DELETE FROM \`${cfg.table}\` WHERE _id IN (${ids.map(() => '?').join(',')})`, ids);
      return { deletedCount: ids.length };
    }
    static async bulkWrite(ops = []) {
      await initDB();
      const mod = [];
      for (const op of ops) {
        if (op.updateOne) {
          for (const d of store[key].values()) {
            if (matches(d, op.updateOne.filter)) { applyUpdate(d, op.updateOne.update); mod.push(d); break; }
          }
        }
      }
      await upsertRows(key, mod);
      return { nMatched: mod.length, modifiedCount: mod.length };
    }
    static async aggregate(pipeline = []) {
      await initDB();
      const docs = Array.from(store[key].values()).filter((d) => !d.removed);
      if (key === 'Client') {
        const active = new Set(Array.from(store.Invoice.values()).filter((i) => !i.removed).map((i) => idOf(i.client)));
        const m = pipeline.find((s) => s.$facet)?.$facet?.newClients?.[0]?.$match;
        return [{
          totalClients: [{ count: docs.filter((c) => c.enabled !== false).length }],
          newClients: [{ count: m ? docs.filter((c) => matches(c, m)).length : 0 }],
          activeClients: [{ count: active.size }],
        }];
      }
      if (key === 'Invoice') {
        if (pipeline.some((s) => s.$facet)) {
          let total = 0; const st = {}, pst = {}, ov = {}; const now = new Date();
          for (const i of docs) {
            total += Number(i.total || 0);
            st[i.status] = (st[i.status] || 0) + 1;
            pst[i.paymentStatus] = (pst[i.paymentStatus] || 0) + 1;
            if (new Date(i.expiredDate) < now) ov[i.status] = (ov[i.status] || 0) + 1;
          }
          return [{
            totalInvoice: docs.length ? [{ total, count: docs.length }] : [],
            statusCounts: Object.entries(st).map(([status, count]) => ({ status, count })),
            paymentStatusCounts: Object.entries(pst).map(([status, count]) => ({ status, count })),
            overdueCounts: Object.entries(ov).map(([status, count]) => ({ status, count })),
          }];
        }
        const total_amount = docs.filter((i) => ['unpaid', 'partially'].includes(i.paymentStatus))
          .reduce((acc, i) => acc + (Number(i.total || 0) - Number(i.credit || 0)), 0);
        return [{ total_amount }];
      }
      if (key === 'Payment') {
        const total = docs.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        return docs.length ? [{ count: docs.length, total }] : [];
      }
      return [];
    }
  }

  RelationalModel.collection = { name: cfg.table };
  return (models[key] = models[rawName] = RelationalModel);
}

const adapter = {
  Schema,
  SchemaTypes: Schema.Types,
  models,
  connection: { on: () => {}, once: () => {} },
  connect: () => initDB(),
  model: (name, schema) => (schema ? buildModel(name, schema) : models[name] || models[name.trim()]),
};

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'mongoose') return adapter;
  if (req === 'mongoose-autopopulate') return () => {};
  return origLoad.apply(this, arguments);
};

module.exports = adapter;
