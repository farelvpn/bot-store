// src/config/index.js

/**
 * File ini bertanggung jawab untuk memuat variabel lingkungan (environment variables)
 * dari file .env di root direktori. Ini adalah cara yang aman untuk mengelola
 * data sensitif seperti token API dan kredensial lainnya tanpa harus
 * menuliskannya langsung di dalam kode (hardcoding).
 */

// Memuat library dotenv untuk membaca file .env
require('dotenv').config();
// Memuat library path bawaan Node.js untuk menangani path file secara konsisten
const path = require('path');

// Mengekspor objek konfigurasi agar bisa digunakan di file lain
module.exports = {
  // Token otentikasi untuk bot Telegram Anda.
  botToken: process.env.BOT_TOKEN,

  // ID numerik unik dari admin utama bot.
  adminId: process.env.ADMIN_USER_ID,

  // Nama toko yang akan ditampilkan di berbagai bagian bot.
  // Jika tidak diatur di .env, akan menggunakan 'RERECHAN STORE' sebagai default.
  storeName: process.env.STORE_NAME || 'RERECHAN STORE',

  // Konfigurasi untuk payment gateway.
  paymentGateway: {
    // URL dasar API dari payment gateway.
    baseUrl: process.env.PAYMENT_GATEWAY_BASE_URL,
    // Username yang dibutuhkan untuk otentikasi ke payment gateway.
    username: process.env.PAYMENT_GATEWAY_USERNAME,
    // Token API untuk otentikasi permintaan ke payment gateway.
    apiToken: process.env.PAYMENT_GATEWAY_API_TOKEN,
  },

  // Konfigurasi untuk mode webhook.
  webhook: {
    // URL publik yang akan didaftarkan ke Telegram. Harus HTTPS.
    url: process.env.WEBHOOK_URL,
    // Port lokal di server Anda di mana aplikasi akan berjalan.
    port: process.env.WEBHOOK_PORT || 3000,
  },

  // Kumpulan path file dan direktori penting yang digunakan oleh bot.
  paths: {
    // Path ke file database utama (JSON).
    db: path.join(__dirname, '../../database.json'),
    // Path ke direktori tempat menyimpan file konfigurasi server VPN.
    serversConfigDir: path.join(__dirname, '../../servers'),
    // Path ke direktori untuk menyimpan file log.
    logs: path.join(__dirname, '../../logs'),
    // Path ke file database SQLite untuk log transaksi.
    sqlite: path.join(__dirname, '../../transactions.sqlite3')
  },
};
