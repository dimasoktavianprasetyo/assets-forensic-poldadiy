const mysql = require('mysql2/promise');
const crypto = require('crypto');
const Module = require('module');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

function checkPortOpen(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(ok);
      }
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function ensureXamppMysqlRunning(host, port) {
  const isOpen = await checkPortOpen(host, port);
  if (isOpen) return;
  const xamppMysqld = 'C:\\xampp\\mysql\\bin\\mysqld.exe';
  const xamppMyIni = 'C:\\xampp\\mysql\\bin\\my.ini';
  if (fs.existsSync(xamppMysqld)) {
    console.log('🔄 Memulai service XAMPP MySQL secara otomatis...');
    const child = spawn(xamppMysqld, [`--defaults-file=${xamppMyIni}`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkPortOpen(host, port)) {
        console.log('✅ Service XAMPP MySQL aktif di port ' + port);
        return;
      }
    }
  }
}

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

const TABLE_SCHEMAS = {
  Admin: {
    tableName: 'admins',
    createSql: `
      CREATE TABLE IF NOT EXISTS admins (
        _id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) DEFAULT NULL,
        photo VARCHAR(500) DEFAULT NULL,
        role VARCHAR(50) DEFAULT 'owner',
        enabled TINYINT(1) DEFAULT 1,
        removed TINYINT(1) DEFAULT 0,
        created DATETIME DEFAULT CURRENT_TIMESTAMP,
        _doc LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => ({
      _id: String(doc._id),
      email: doc.email || '',
      name: doc.name || '',
      surname: doc.surname || null,
      photo: doc.photo || null,
      role: doc.role || 'owner',
      enabled: doc.enabled ? 1 : 0,
      removed: doc.removed ? 1 : 0,
      created: doc.created ? new Date(doc.created) : new Date(),
      _doc: JSON.stringify(doc),
    }),
  },
  AdminPassword: {
    tableName: 'admin_passwords',
    createSql: `
      CREATE TABLE IF NOT EXISTS admin_passwords (
        _id VARCHAR(36) PRIMARY KEY,
        user VARCHAR(36) NOT NULL,
        password VARCHAR(255) NOT NULL,
        salt VARCHAR(100) NOT NULL,
        emailToken VARCHAR(255) DEFAULT NULL,
        resetToken VARCHAR(255) DEFAULT NULL,
        emailVerified TINYINT(1) DEFAULT 1,
        authType VARCHAR(50) DEFAULT 'email',
        removed TINYINT(1) DEFAULT 0,
        _doc LONGTEXT,
        INDEX idx_user (user)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => ({
      _id: String(doc._id),
      user: doc.user && typeof doc.user === 'object' ? String(doc.user._id) : String(doc.user || ''),
      password: doc.password || '',
      salt: doc.salt || '',
      emailToken: doc.emailToken || null,
      resetToken: doc.resetToken || null,
      emailVerified: doc.emailVerified ? 1 : 0,
      authType: doc.authType || 'email',
      removed: doc.removed ? 1 : 0,
      _doc: JSON.stringify(doc),
    }),
  },
  Setting: {
    tableName: 'settings',
    createSql: `
      CREATE TABLE IF NOT EXISTS settings (
        _id VARCHAR(36) PRIMARY KEY,
        settingCategory VARCHAR(100) NOT NULL,
        settingKey VARCHAR(100) NOT NULL,
        settingValue TEXT,
        valueType VARCHAR(50) DEFAULT 'String',
        isPrivate TINYINT(1) DEFAULT 0,
        isCoreSetting TINYINT(1) DEFAULT 0,
        enabled TINYINT(1) DEFAULT 1,
        removed TINYINT(1) DEFAULT 0,
        _doc LONGTEXT,
        INDEX idx_setting_key (settingKey),
        INDEX idx_setting_cat (settingCategory)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => ({
      _id: String(doc._id),
      settingCategory: (doc.settingCategory || '').toLowerCase(),
      settingKey: (doc.settingKey || '').toLowerCase(),
      settingValue:
        typeof doc.settingValue === 'object'
          ? JSON.stringify(doc.settingValue)
          : String(doc.settingValue ?? ''),
      valueType: doc.valueType || 'String',
      isPrivate: doc.isPrivate ? 1 : 0,
      isCoreSetting: doc.isCoreSetting ? 1 : 0,
      enabled: doc.enabled !== false ? 1 : 0,
      removed: doc.removed ? 1 : 0,
      _doc: JSON.stringify(doc),
    }),
  },
  Client: {
    tableName: 'clients',
    createSql: `
      CREATE TABLE IF NOT EXISTS clients (
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
        _doc LONGTEXT,
        INDEX idx_name (name),
        INDEX idx_removed (removed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => ({
      _id: String(doc._id),
      name: doc.name || '',
      phone: doc.phone || null,
      country: doc.country || null,
      address: doc.address || null,
      email: doc.email || null,
      createdBy: doc.createdBy && typeof doc.createdBy === 'object' ? String(doc.createdBy._id) : doc.createdBy ? String(doc.createdBy) : null,
      assigned: doc.assigned && typeof doc.assigned === 'object' ? String(doc.assigned._id) : doc.assigned ? String(doc.assigned) : null,
      enabled: doc.enabled !== false ? 1 : 0,
      removed: doc.removed ? 1 : 0,
      created: doc.created ? new Date(doc.created) : new Date(),
      updated: doc.updated ? new Date(doc.updated) : new Date(),
      _doc: JSON.stringify(doc),
    }),
  },
  Invoice: {
    tableName: 'invoices',
    createSql: `
      CREATE TABLE IF NOT EXISTS invoices (
        _id VARCHAR(36) PRIMARY KEY,
        number INT NOT NULL,
        year INT NOT NULL,
        client VARCHAR(36) NOT NULL,
        createdBy VARCHAR(36) DEFAULT NULL,
        date DATETIME NOT NULL,
        expiredDate DATETIME NOT NULL,
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
        _doc LONGTEXT,
        INDEX idx_client (client),
        INDEX idx_status (status),
        INDEX idx_payment_status (paymentStatus),
        INDEX idx_removed (removed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => {
      const clientId = doc.client && typeof doc.client === 'object' ? String(doc.client._id) : String(doc.client || '');
      const createdById = doc.createdBy && typeof doc.createdBy === 'object' ? String(doc.createdBy._id) : doc.createdBy ? String(doc.createdBy) : null;
      const cleanDoc = {
        ...doc,
        client: clientId,
        createdBy: createdById,
        payment: Array.isArray(doc.payment)
          ? doc.payment.map((p) => (p && typeof p === 'object' ? String(p._id) : String(p)))
          : [],
      };
      return {
        _id: String(doc._id),
        number: Number(doc.number || 1),
        year: Number(doc.year || new Date().getFullYear()),
        client: clientId,
        createdBy: createdById,
        date: doc.date ? new Date(doc.date) : new Date(),
        expiredDate: doc.expiredDate ? new Date(doc.expiredDate) : new Date(),
        subTotal: Number(doc.subTotal || 0),
        taxRate: Number(doc.taxRate || 0),
        taxTotal: Number(doc.taxTotal || 0),
        total: Number(doc.total || 0),
        credit: Number(doc.credit || 0),
        discount: Number(doc.discount || 0),
        currency: doc.currency || 'USD',
        status: doc.status || 'draft',
        paymentStatus: doc.paymentStatus || 'unpaid',
        isOverdue: doc.isOverdue ? 1 : 0,
        approved: doc.approved ? 1 : 0,
        notes: doc.notes || null,
        pdf: doc.pdf || null,
        removed: doc.removed ? 1 : 0,
        created: doc.created ? new Date(doc.created) : new Date(),
        updated: doc.updated ? new Date(doc.updated) : new Date(),
        _doc: JSON.stringify(cleanDoc),
      };
    },
  },
  Payment: {
    tableName: 'payments',
    createSql: `
      CREATE TABLE IF NOT EXISTS payments (
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
        _doc LONGTEXT,
        INDEX idx_client (client),
        INDEX idx_invoice (invoice),
        INDEX idx_removed (removed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => {
      const clientId = doc.client && typeof doc.client === 'object' ? String(doc.client._id) : String(doc.client || '');
      const invoiceId = doc.invoice && typeof doc.invoice === 'object' ? String(doc.invoice._id) : String(doc.invoice || '');
      const createdById = doc.createdBy && typeof doc.createdBy === 'object' ? String(doc.createdBy._id) : doc.createdBy ? String(doc.createdBy) : null;
      const cleanDoc = {
        ...doc,
        client: clientId,
        invoice: invoiceId,
        createdBy: createdById,
      };
      return {
        _id: String(doc._id),
        number: Number(doc.number || 1),
        client: clientId,
        invoice: invoiceId,
        createdBy: createdById,
        date: doc.date ? new Date(doc.date) : new Date(),
        amount: Number(doc.amount || 0),
        currency: doc.currency || 'USD',
        ref: doc.ref || null,
        description: doc.description || null,
        pdf: doc.pdf || null,
        removed: doc.removed ? 1 : 0,
        created: doc.created ? new Date(doc.created) : new Date(),
        updated: doc.updated ? new Date(doc.updated) : new Date(),
        _doc: JSON.stringify(cleanDoc),
      };
    },
  },
  Upload: {
    tableName: 'uploads',
    createSql: `
      CREATE TABLE IF NOT EXISTS uploads (
        _id VARCHAR(36) PRIMARY KEY,
        removed TINYINT(1) DEFAULT 0,
        created DATETIME DEFAULT CURRENT_TIMESTAMP,
        _doc LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    toRow: (doc) => ({
      _id: String(doc._id),
      removed: doc.removed ? 1 : 0,
      created: doc.created ? new Date(doc.created) : new Date(),
      _doc: JSON.stringify(doc),
    }),
  },
};

let pool = null;
let initPromise = null;
const modelsRegistry = {};
const memoryStore = {
  Admin: new Map(),
  AdminPassword: new Map(),
  Setting: new Map(),
  Client: new Map(),
  Invoice: new Map(),
  Payment: new Map(),
  Upload: new Map(),
};

async function ensureConnected() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const port = Number(process.env.MYSQL_PORT || 3306);
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || 'idurar_erp_crm';

    await ensureXamppMysqlRunning(host, port);

    const rootConn = await mysql.createConnection({ host, port, user, password });
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    for (const [modelKey, cfg] of Object.entries(TABLE_SCHEMAS)) {
      await pool.query(cfg.createSql);
      const [rows] = await pool.query(`SELECT _doc FROM \`${cfg.tableName}\``);
      const store = memoryStore[modelKey];
      store.clear();
      for (const r of rows) {
        if (r._doc) {
          try {
            const parsed = JSON.parse(r._doc);
            if (parsed.date) parsed.date = new Date(parsed.date);
            if (parsed.expiredDate) parsed.expiredDate = new Date(parsed.expiredDate);
            if (parsed.created) parsed.created = new Date(parsed.created);
            if (parsed.updated) parsed.updated = new Date(parsed.updated);
            store.set(String(parsed._id), parsed);
          } catch (e) {
            // ignore malformed row
          }
        }
      }
    }
    console.log(`✅ MySQL Connected → Database: ${database} (${host}:${port})`);
  })();
  return initPromise;
}

async function persistDoc(modelKey, doc) {
  await ensureConnected();
  const cfg = TABLE_SCHEMAS[modelKey] || TABLE_SCHEMAS.Upload;
  const row = cfg.toRow(doc);
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols
    .filter((c) => c !== '_id')
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');
  const sql = `INSERT INTO \`${cfg.tableName}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  await pool.query(sql, cols.map((c) => row[c]));
}

async function persistManyDocs(modelKey, docs) {
  await ensureConnected();
  if (!docs || docs.length === 0) return;
  const cfg = TABLE_SCHEMAS[modelKey] || TABLE_SCHEMAS.Upload;
  const firstRow = cfg.toRow(docs[0]);
  const cols = Object.keys(firstRow);
  const updates = cols
    .filter((c) => c !== '_id')
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');

  const chunkSize = 250;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const slice = docs.slice(i, i + chunkSize);
    const values = [];
    const rowPlaceholders = [];
    for (const d of slice) {
      const r = cfg.toRow(d);
      rowPlaceholders.push(`(${cols.map(() => '?').join(', ')})`);
      for (const c of cols) {
        values.push(r[c]);
      }
    }
    const sql = `INSERT INTO \`${cfg.tableName}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES ${rowPlaceholders.join(', ')} ON DUPLICATE KEY UPDATE ${updates}`;
    await pool.query(sql, values);
  }
}

function getNestedValue(obj, path) {
  if (!obj) return undefined;
  if ( path in obj ) return obj[path];
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      return cur.map((item) => getNestedValue(item, p));
    }
    cur = cur[p];
  }
  return cur;
}

function matchCondition(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, cond] of Object.entries(filter)) {
    if (key === 'undefined' || cond === undefined) continue;
    if (key === '$or' && Array.isArray(cond)) {
      if (cond.length > 0 && !cond.some((sub) => matchCondition(doc, sub))) {
        return false;
      }
      continue;
    }
    if (key === '$and' && Array.isArray(cond)) {
      if (!cond.every((sub) => matchCondition(doc, sub))) {
        return false;
      }
      continue;
    }

    const rawVal = getNestedValue(doc, key);
    const val =
      rawVal && typeof rawVal === 'object' && rawVal._id !== undefined ? rawVal._id : rawVal;

    if (cond && typeof cond === 'object' && !(cond instanceof RegExp) && !(cond instanceof Date)) {
      if ('$regex' in cond) {
        const re =
          cond.$regex instanceof RegExp
            ? cond.$regex
            : new RegExp(String(cond.$regex || ''), cond.$options || 'i');
        if (!re.test(String(val ?? ''))) return false;
        continue;
      }
      if ('$in' in cond && Array.isArray(cond.$in)) {
        if (!cond.$in.map(String).includes(String(val))) return false;
        continue;
      }
      if ('$gte' in cond || '$lte' in cond || '$lt' in cond || '$gt' in cond) {
        const dVal = val instanceof Date ? val.getTime() : new Date(val).getTime();
        if ('$gte' in cond && !(dVal >= new Date(cond.$gte).getTime())) return false;
        if ('$lte' in cond && !(dVal <= new Date(cond.$lte).getTime())) return false;
        if ('$lt' in cond && !(dVal < new Date(cond.$lt).getTime())) return false;
        if ('$gt' in cond && !(dVal > new Date(cond.$gt).getTime())) return false;
        continue;
      }
    }

    if (cond instanceof RegExp) {
      if (!cond.test(String(val ?? ''))) return false;
      continue;
    }

    if (typeof val === 'boolean' && typeof cond === 'string') {
      if (val !== (cond === 'true')) return false;
      continue;
    }

    if (String(val) !== String(cond)) {
      return false;
    }
  }
  return true;
}

function attachDocHelpers(doc, modelKey, schema) {
  if (!doc || typeof doc !== 'object') return doc;
  const clone = { ...doc };
  Object.defineProperty(clone, 'id', {
    get() {
      return String(this._id);
    },
    enumerable: false,
  });
  if (schema && schema.methods) {
    for (const [mName, fn] of Object.entries(schema.methods)) {
      Object.defineProperty(clone, mName, {
        value: fn.bind(clone),
        enumerable: false,
      });
    }
  }
  return clone;
}

function populateDoc(doc, modelKey, schema) {
  if (!doc) return null;
  const cloned = attachDocHelpers(doc, modelKey, schema);

  if (modelKey === 'Invoice') {
    const clientId = cloned.client && typeof cloned.client === 'object' ? cloned.client._id : cloned.client;
    if (clientId && memoryStore.Client.has(String(clientId))) {
      cloned.client = attachDocHelpers(memoryStore.Client.get(String(clientId)), 'Client');
    }
    const adminId = cloned.createdBy && typeof cloned.createdBy === 'object' ? cloned.createdBy._id : cloned.createdBy;
    if (adminId && memoryStore.Admin.has(String(adminId))) {
      cloned.createdBy = attachDocHelpers(memoryStore.Admin.get(String(adminId)), 'Admin');
    }
  } else if (modelKey === 'Payment') {
    const clientId = cloned.client && typeof cloned.client === 'object' ? cloned.client._id : cloned.client;
    if (clientId && memoryStore.Client.has(String(clientId))) {
      cloned.client = attachDocHelpers(memoryStore.Client.get(String(clientId)), 'Client');
    }
    const invId = cloned.invoice && typeof cloned.invoice === 'object' ? cloned.invoice._id : cloned.invoice;
    if (invId && memoryStore.Invoice.has(String(invId))) {
      cloned.invoice = populateDoc(memoryStore.Invoice.get(String(invId)), 'Invoice');
    }
    const adminId = cloned.createdBy && typeof cloned.createdBy === 'object' ? cloned.createdBy._id : cloned.createdBy;
    if (adminId && memoryStore.Admin.has(String(adminId))) {
      cloned.createdBy = attachDocHelpers(memoryStore.Admin.get(String(adminId)), 'Admin');
    }
  }
  return cloned;
}

class QueryBuilder {
  constructor(modelKey, schema, op, filter = {}, update = null, options = {}) {
    this.modelKey = modelKey;
    this.schema = schema;
    this.op = op; // 'find', 'findOne', 'countDocuments', 'findOneAndUpdate'
    this.filter = { ...filter };
    this.update = update;
    this.options = options;
    this._skip = 0;
    this._limit = null;
    this._sort = null;
    this._lastWhereField = null;
  }

  where(field, val) {
    if (val !== undefined) {
      this.filter[field] = val;
    } else {
      this._lastWhereField = field;
    }
    return this;
  }

  equals(val) {
    if (this._lastWhereField) {
      this.filter[this._lastWhereField] = val;
      this._lastWhereField = null;
    }
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = Number(n) || null;
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  populate() {
    return this;
  }

  lean() {
    return this;
  }

  async exec() {
    await ensureConnected();
    const store = memoryStore[this.modelKey] || memoryStore.Upload;
    const allDocs = Array.from(store.values());

    if (this.op === 'countDocuments') {
      return allDocs.filter((d) => matchCondition(d, this.filter)).length;
    }

    if (this.op === 'findOne') {
      const found = allDocs.find((d) => matchCondition(d, this.filter));
      return found ? populateDoc(found, this.modelKey, this.schema) : null;
    }

    if (this.op === 'findOneAndUpdate') {
      const target = allDocs.find((d) => matchCondition(d, this.filter));
      if (!target) return null;
      applyUpdateToDoc(target, this.update);
      target.updated = new Date();
      store.set(String(target._id), target);
      await persistDoc(this.modelKey, target);
      return populateDoc(target, this.modelKey, this.schema);
    }

    // 'find'
    let matched = allDocs.filter((d) => matchCondition(d, this.filter));

    if (this._sort && typeof this._sort === 'object') {
      const entries = Object.entries(this._sort);
      if (entries.length > 0) {
        const [field, dirVal] = entries[0];
        const dir = dirVal === 'asc' || dirVal === 1 || dirVal === '1' ? 1 : -1;
        matched.sort((a, b) => {
          const va = a[field];
          const vb = b[field];
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va instanceof Date || vb instanceof Date) {
            return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
          }
          if (typeof va === 'number' && typeof vb === 'number') {
            return (va - vb) * dir;
          }
          return String(va).localeCompare(String(vb)) * dir;
        });
      }
    }

    if (this._skip > 0) {
      matched = matched.slice(this._skip);
    }
    if (this._limit !== null) {
      matched = matched.slice(0, this._limit);
    }

    return matched.map((d) => populateDoc(d, this.modelKey, this.schema));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

function applyUpdateToDoc(doc, update) {
  if (!update) return;
  for (const [k, v] of Object.entries(update)) {
    if (k === '$set' && typeof v === 'object') {
      Object.assign(doc, v);
    } else if (k === '$inc' && typeof v === 'object') {
      for (const [incKey, incVal] of Object.entries(v)) {
        doc[incKey] = Number(doc[incKey] || 0) + Number(incVal);
      }
    } else if (k === '$push' && typeof v === 'object') {
      for (const [arrKey, itemVal] of Object.entries(v)) {
        if (!Array.isArray(doc[arrKey])) doc[arrKey] = [];
        doc[arrKey].push(itemVal);
      }
    } else if (k === '$pull' && typeof v === 'object') {
      for (const [arrKey, pullVal] of Object.entries(v)) {
        if (Array.isArray(doc[arrKey])) {
          doc[arrKey] = doc[arrKey].filter((x) => String(x) !== String(pullVal));
        }
      }
    } else if (!k.startsWith('$')) {
      doc[k] = v;
    }
  }
}

function applySchemaDefaults(data, schema) {
  const obj = { ...data };
  if (!obj._id) obj._id = generateObjectId();
  if (schema && schema.definition) {
    for (const [field, spec] of Object.entries(schema.definition)) {
      if (obj[field] === undefined && spec && typeof spec === 'object' && 'default' in spec) {
        obj[field] = typeof spec.default === 'function' ? spec.default() : Array.isArray(spec.default) ? [...spec.default] : spec.default;
      }
      if (obj[field] !== undefined && spec && typeof spec === 'object') {
        if (spec.lowercase && typeof obj[field] === 'string') {
          obj[field] = obj[field].toLowerCase();
        }
        if (spec.uppercase && typeof obj[field] === 'string') {
          obj[field] = obj[field].toUpperCase();
        }
        if (spec.trim && typeof obj[field] === 'string') {
          obj[field] = obj[field].trim();
        }
      }
    }
  }
  if (obj.removed === undefined) obj.removed = false;
  return obj;
}

class Schema {
  constructor(definition = {}) {
    this.definition = definition;
    this.methods = {};
  }
  plugin() {
    return this;
  }
  index() {
    return this;
  }
}
Schema.ObjectId = String;
Schema.Types = {
  ObjectId: String,
  Mixed: Object,
};

function createModel(rawName, schema) {
  const modelKey = rawName.trim();
  if (modelsRegistry[modelKey]) return modelsRegistry[modelKey];

  const cfg = TABLE_SCHEMAS[modelKey] || TABLE_SCHEMAS.Upload;

  class MySQLModel {
    constructor(data = {}) {
      const normalized = applySchemaDefaults(data, schema);
      Object.assign(this, normalized);
      Object.defineProperty(this, 'id', {
        get() {
          return String(this._id);
        },
        enumerable: false,
      });
      if (schema && schema.methods) {
        for (const [mName, fn] of Object.entries(schema.methods)) {
          Object.defineProperty(this, mName, {
            value: fn.bind(this),
            enumerable: false,
          });
        }
      }
    }

    async save() {
      await ensureConnected();
      const plain = {};
      for (const k of Object.keys(this)) {
        plain[k] = this[k];
      }
      if (!plain._id) plain._id = generateObjectId();
      const store = memoryStore[modelKey] || memoryStore.Upload;
      store.set(String(plain._id), plain);
      await persistDoc(modelKey, plain);
      return populateDoc(plain, modelKey, schema);
    }

    static find(filter = {}) {
      return new QueryBuilder(modelKey, schema, 'find', filter);
    }

    static findOne(filter = {}) {
      return new QueryBuilder(modelKey, schema, 'findOne', filter);
    }

    static findById(id) {
      return new QueryBuilder(modelKey, schema, 'findOne', { _id: id });
    }

    static findOneAndUpdate(filter = {}, update = {}, options = {}) {
      return new QueryBuilder(modelKey, schema, 'findOneAndUpdate', filter, update, options);
    }

    static findByIdAndUpdate(id, update = {}, options = {}) {
      return new QueryBuilder(modelKey, schema, 'findOneAndUpdate', { _id: id }, update, options);
    }

    static countDocuments(filter = {}) {
      return new QueryBuilder(modelKey, schema, 'countDocuments', filter);
    }

    static async create(data) {
      const inst = new MySQLModel(data);
      return inst.save();
    }

    static async insertMany(arr = []) {
      await ensureConnected();
      const store = memoryStore[modelKey] || memoryStore.Upload;
      const inserted = [];
      for (const item of arr) {
        const doc = applySchemaDefaults(item, schema);
        store.set(String(doc._id), doc);
        inserted.push(doc);
      }
      await persistManyDocs(modelKey, inserted);
      return inserted.map((d) => populateDoc(d, modelKey, schema));
    }

    static async updateMany(filter = {}, update = {}) {
      await ensureConnected();
      const store = memoryStore[modelKey] || memoryStore.Upload;
      const updated = [];
      for (const d of store.values()) {
        if (matchCondition(d, filter)) {
          applyUpdateToDoc(d, update);
          updated.push(d);
        }
      }
      if (updated.length > 0) {
        await persistManyDocs(modelKey, updated);
      }
      return { acknowledged: true, modifiedCount: updated.length };
    }

    static async deleteMany(filter = {}) {
      await ensureConnected();
      const store = memoryStore[modelKey] || memoryStore.Upload;
      if (Object.keys(filter).length === 0) {
        store.clear();
        await pool.query(`DELETE FROM \`${cfg.tableName}\``);
        return { deletedCount: 0 };
      }
      const toDelete = [];
      for (const [id, d] of store.entries()) {
        if (matchCondition(d, filter)) {
          store.delete(id);
          toDelete.push(id);
        }
      }
      if (toDelete.length > 0) {
        await pool.query(
          `DELETE FROM \`${cfg.tableName}\` WHERE _id IN (${toDelete.map(() => '?').join(',')})`,
          toDelete
        );
      }
      return { deletedCount: toDelete.length };
    }

    static async bulkWrite(ops = []) {
      await ensureConnected();
      const store = memoryStore[modelKey] || memoryStore.Upload;
      const modifiedDocs = [];
      let nMatched = 0;

      for (const op of ops) {
        if (op.updateOne) {
          const { filter, update } = op.updateOne;
          for (const d of store.values()) {
            if (matchCondition(d, filter)) {
              nMatched++;
              applyUpdateToDoc(d, update);
              modifiedDocs.push(d);
              break;
            }
          }
        }
      }
      if (modifiedDocs.length > 0) {
        await persistManyDocs(modelKey, modifiedDocs);
      }
      return { nMatched, modifiedCount: modifiedDocs.length };
    }

    static async aggregate(pipeline = []) {
      await ensureConnected();
      const store = memoryStore[modelKey] || memoryStore.Upload;
      const docs = Array.from(store.values());

      if (modelKey === 'Client') {
        const activeClientsSet = new Set();
        for (const inv of memoryStore.Invoice.values()) {
          if (!inv.removed && inv.client) {
            const cId = typeof inv.client === 'object' ? inv.client._id : inv.client;
            activeClientsSet.add(String(cId));
          }
        }
        const validClients = docs.filter((c) => !c.removed && c.enabled !== false);
        let newClientsCount = 0;
        const facetStage = pipeline.find((s) => s.$facet);
        const newClientMatch = facetStage?.$facet?.newClients?.[0]?.$match;
        for (const c of validClients) {
          if (newClientMatch && matchCondition(c, newClientMatch)) {
            newClientsCount++;
          }
        }
        return [
          {
            totalClients: [{ count: validClients.length }],
            newClients: [{ count: newClientsCount }],
            activeClients: [{ count: activeClientsSet.size }],
          },
        ];
      }

      if (modelKey === 'Invoice') {
        const hasFacet = pipeline.some((s) => s.$facet);
        const activeInvoices = docs.filter((inv) => !inv.removed);
        if (hasFacet) {
          let totalSum = 0;
          const statusMap = {};
          const paymentStatusMap = {};
          const overdueMap = {};
          const now = new Date();

          for (const inv of activeInvoices) {
            totalSum += Number(inv.total || 0);
            const st = inv.status || 'draft';
            const pst = inv.paymentStatus || 'unpaid';
            statusMap[st] = (statusMap[st] || 0) + 1;
            paymentStatusMap[pst] = (paymentStatusMap[pst] || 0) + 1;
            if (inv.expiredDate && new Date(inv.expiredDate) < now) {
              overdueMap[st] = (overdueMap[st] || 0) + 1;
            }
          }

          return [
            {
              totalInvoice: activeInvoices.length > 0 ? [{ total: totalSum, count: activeInvoices.length }] : [],
              statusCounts: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
              paymentStatusCounts: Object.entries(paymentStatusMap).map(([status, count]) => ({
                status,
                count,
              })),
              overdueCounts: Object.entries(overdueMap).map(([status, count]) => ({ status, count })),
            },
          ];
        } else {
          // unpaid aggregate
          let unpaidTotal = 0;
          for (const inv of activeInvoices) {
            if (['unpaid', 'partially'].includes(inv.paymentStatus)) {
              unpaidTotal += Number(inv.total || 0) - Number(inv.credit || 0);
            }
          }
          return [{ total_amount: unpaidTotal }];
        }
      }

      if (modelKey === 'Payment') {
        const activePayments = docs.filter((p) => !p.removed);
        let total = 0;
        for (const p of activePayments) {
          total += Number(p.amount || 0);
        }
        return activePayments.length > 0 ? [{ count: activePayments.length, total }] : [];
      }

      return [];
    }
  }

  MySQLModel.collection = { name: cfg.tableName };
  modelsRegistry[modelKey] = MySQLModel;
  modelsRegistry[rawName] = MySQLModel;
  return MySQLModel;
}

const mysqlMongoose = {
  Schema,
  SchemaTypes: Schema.Types,
  models: modelsRegistry,
  connection: {
    on: () => {},
    once: () => {},
  },
  connect: () => ensureConnected(),
  model: (name, schema) => {
    if (!schema) {
      return modelsRegistry[name] || modelsRegistry[name.trim()];
    }
    return createModel(name, schema);
  },
};

// Hook Node's module loader so any `require('mongoose')` or `require('mongoose-autopopulate')` uses our MySQL engine
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'mongoose') {
    return mysqlMongoose;
  }
  if (request === 'mongoose-autopopulate') {
    return () => {};
  }
  return originalLoad.apply(this, arguments);
};

module.exports = mysqlMongoose;
