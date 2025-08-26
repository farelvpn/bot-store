// src/services/sqliteService.js

/**
 * Service ini menyediakan antarmuka sederhana untuk berinteraksi dengan database SQLite.
 * Digunakan untuk menyimpan data transaksional yang lebih terstruktur
 * seperti riwayat pembelian VPN, topup, dll., yang tidak cocok disimpan di file JSON.
 */

const sqlite3 = require('sqlite3').verbose();
const config = require('../config');
const { writeLog } = require('../utils/logger');

// Path ke file database SQLite.
const DB_PATH = config.paths.sqlite;
// Membuat atau membuka koneksi ke database.
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    writeLog(`[SQLite] FATAL: Gagal terhubung ke database: ${err.message}`);
  } else {
    writeLog('[SQLite] Berhasil terhubung ke database.');
    // Menjalankan inisialisasi tabel saat koneksi berhasil dibuat.
    initializeTables();
  }
});

/**
 * Membuat tabel-tabel yang diperlukan jika belum ada.
 * Dijalankan sekali saat bot pertama kali start.
 */
function initializeTables() {
  const createVpnTransactionsTable = `
    CREATE TABLE IF NOT EXISTS vpn_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idtrx TEXT NOT NULL UNIQUE,
      telegram_id TEXT NOT NULL,
      buyer_telegram_username TEXT,
      server_name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      username TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      purchase_date TEXT NOT NULL
    );
  `;

  const createTopupLogsTable = `
    CREATE TABLE IF NOT EXISTS topup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id TEXT UNIQUE,
        telegram_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        payment_method TEXT,
        created_at TEXT NOT NULL
    );
  `;
  
  // Menjalankan query untuk membuat setiap tabel.
  db.exec(createVpnTransactionsTable, handleDbError);
  db.exec(createTopupLogsTable, handleDbError);
}

/**
 * Fungsi callback generik untuk menangani error dari database.
 * @param {Error|null} err Objek error, atau null jika tidak ada error.
 */
function handleDbError(err) {
  if (err) {
    writeLog(`[SQLite] Error eksekusi query: ${err.message}`);
  }
}

/**
 * Menjalankan query yang tidak mengembalikan baris (INSERT, UPDATE, DELETE).
 * @param {string} sql Query SQL yang akan dijalankan.
 * @param {Array} params Parameter untuk query (mencegah SQL Injection).
 * @returns {Promise<object>} Promise yang resolve dengan metadata hasil eksekusi.
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        writeLog(`[SQLite] Error RUN query: ${sql} | ${err.message}`);
        reject(err);
      } else {
        // 'this' di sini merujuk pada statement SQLite.
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Menjalankan query yang mengembalikan satu baris data (SELECT ... LIMIT 1).
 * @param {string} sql Query SQL.
 * @param {Array} params Parameter untuk query.
 * @returns {Promise<object|null>} Promise yang resolve dengan objek baris data, atau undefined.
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        writeLog(`[SQLite] Error GET query: ${sql} | ${err.message}`);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Menjalankan query yang mengembalikan banyak baris data (SELECT).
 * @param {string} sql Query SQL.
 * @param {Array} params Parameter untuk query.
 * @returns {Promise<Array<object>>} Promise yang resolve dengan array objek baris data.
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        writeLog(`[SQLite] Error ALL query: ${sql} | ${err.message}`);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}


module.exports = {
  run,
  get,
  all,
  db // Mengekspor instance db jika diperlukan untuk operasi yang lebih kompleks.
};
