// src/services/userService.js

/**
 * Service ini berfungsi sebagai lapisan abstraksi untuk berinteraksi dengan
 * database pengguna (dalam kasus ini, file JSON). Semua fungsi yang berhubungan
 * dengan data pengguna—seperti membuat, membaca, memperbarui, atau menghapus—
 * ditempatkan di sini untuk menjaga konsistensi dan kemudahan pengelolaan.
 */

const fs = require('fs');
const config = require('../config');
const { writeLog } = require('../utils/logger');

// Path ke file database utama.
const DB_PATH = config.paths.db;

/**
 * Memuat seluruh isi database dari file JSON.
 * @returns {object} Objek database yang berisi data pengguna, pengaturan, dll.
 */
function loadDB() {
  // Cek apakah file database sudah ada.
  if (fs.existsSync(DB_PATH)) {
    // Jika ada, baca file dan parse kontennya dari JSON ke objek JavaScript.
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  // Jika tidak ada, buat struktur database default.
  return {
    users: {}, // Objek untuk menyimpan semua data pengguna.
    settings: { // Objek untuk menyimpan pengaturan global bot.
      topup: {
        minAmount: 10000,
        maxAmount: 1000000,
      }
    },
    // Tambahkan struktur lain jika diperlukan.
  };
}

/**
 * Menyimpan objek database kembali ke dalam file JSON.
 * @param {object} db Objek database yang akan disimpan.
 */
function saveDB(db) {
  // Tulis kembali objek ke file JSON dengan format yang rapi (indentasi 2 spasi).
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Memastikan seorang pengguna terdaftar di database.
 * Jika pengguna belum ada, data baru akan dibuat.
 * @param {string} userId ID unik pengguna Telegram.
 * @param {string} username Username Telegram pengguna (e.g., '@nama_pengguna').
 * @returns {boolean} `true` jika pengguna baru berhasil didaftarkan, `false` jika sudah ada.
 */
function ensureUser(userId, username) {
  const db = loadDB();
  // Cek apakah user dengan ID ini belum ada di database.
  if (!db.users[userId]) {
    // Buat entri baru untuk pengguna.
    db.users[userId] = {
      username: username || `user${userId}`,
      balance: 0, // Saldo awal.
      role: 'user', // Peran default.
      registered_at: new Date().toISOString(), // Waktu pendaftaran.
      topup_history: [], // Riwayat topup.
    };
    saveDB(db);
    writeLog(`[UserService] Pengguna baru terdaftar: ID ${userId}, Username @${username}`);
    return true; // Mengindikasikan pengguna baru.
  }
  return false; // Mengindikasikan pengguna sudah ada.
}

/**
 * Memperbarui saldo seorang pengguna.
 * @param {string} userId ID pengguna yang akan diperbarui.
 * @param {number} amount Jumlah yang akan ditambahkan (bisa positif atau negatif).
 * @param {string} type Tipe transaksi (e.g., 'topup_gateway', 'pembelian_vpn').
 * @param {object} metadata Informasi tambahan tentang transaksi (e.g., { invoiceId: 'xyz' }).
 * @returns {object} Berisi data pengguna yang telah diperbarui dan saldo lamanya.
 */
function updateUserBalance(userId, amount, type, metadata = {}) {
  const db = loadDB();
  // Pastikan pengguna ada di database.
  if (!db.users[userId]) {
    writeLog(`[UserService] WARNING: Gagal update saldo. User ID ${userId} tidak ditemukan.`);
    return null;
  }
  
  const oldBalance = db.users[userId].balance;
  // Perbarui saldo pengguna.
  db.users[userId].balance += amount;
  
  // Tambahkan catatan ke riwayat topup jika tipe transaksinya adalah topup.
  if (type.startsWith('topup')) {
      db.users[userId].topup_history.push({
          amount,
          type,
          ...metadata,
          date: new Date().toISOString(),
          new_balance: db.users[userId].balance,
      });
  }

  saveDB(db);
  writeLog(`[UserService] Saldo User ID ${userId} diperbarui. Lama: ${oldBalance}, Baru: ${db.users[userId].balance}, Tipe: ${type}`);
  return { user: db.users[userId], oldBalance };
}

/**
 * Mendapatkan data lengkap seorang pengguna.
 * @param {string} userId ID pengguna.
 * @returns {object|null} Objek data pengguna, atau null jika tidak ditemukan.
 */
function getUser(userId) {
  const db = loadDB();
  return db.users[userId] || null;
}

/**
 * Mendapatkan pengaturan topup dari database.
 * @returns {object} Objek pengaturan topup (minAmount, maxAmount).
 */
function getTopupSettings() {
    const db = loadDB();
    // Mengembalikan pengaturan topup, atau objek default jika tidak ada.
    return db.settings?.topup || { minAmount: 10000, maxAmount: 1000000 };
}

// Mengekspor semua fungsi agar bisa digunakan oleh file lain.
module.exports = {
  loadDB,
  saveDB,
  ensureUser,
  updateUserBalance,
  getUser,
  getTopupSettings
};
