const mysql = require('mysql2/promise');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

let pool = null;

function checkPort(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (ok) => {
      s.destroy();
      resolve(ok);
    };
    s.setTimeout(timeout);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
    s.connect(port, host);
  });
}

async function ensureMysqlRunning(host, port) {
  if (await checkPort(host, port)) return;
  const bin = 'C:\\xampp\\mysql\\bin\\mysqld.exe';
  const ini = 'C:\\xampp\\mysql\\bin\\my.ini';
  if (fs.existsSync(bin)) {
    spawn(bin, [`--defaults-file=${ini}`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkPort(host, port)) return;
    }
  }
}

async function getPool() {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'sim_aset_bid_tik';

  await ensureMysqlRunning(host, port);

  const initConn = await mysql.createConnection({ host, port, user, password });
  await initConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await initConn.end();

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });

  return pool;
}

module.exports = { getPool };

