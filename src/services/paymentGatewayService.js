// src/services/paymentGatewayService.js

/**
 * Service ini adalah satu-satunya titik kontak antara bot dan API Payment Gateway.
 * Semua logika untuk membuat request, mengirim data, dan menangani respons
 * dari gateway terpusat di sini. Ini membuat kode lebih bersih dan mudah dikelola.
 */

const axios = require('axios');
const config = require('../config');
const { writeLog } = require('../utils/logger');

// Membuat instance axios dengan konfigurasi default untuk semua request ke gateway.
const apiClient = axios.create({
  baseURL: config.paymentGateway.baseUrl, // URL dasar API dari config.
  headers: {
    // Mengatur header otentikasi Bearer Token.
    'Authorization': `Bearer ${config.paymentGateway.apiToken}`,
    // Menentukan format data yang dikirim adalah JSON.
    'Content-Type': 'application/json'
  }
});

/**
 * Membuat invoice pembayaran baru melalui API payment gateway.
 * @param {number} amount Jumlah nominal topup.
 * @param {string} userId ID pengguna Telegram, untuk referensi.
 * @param {string} userTelegramUsername Username @ pengguna, untuk referensi.
 * @returns {Promise<Object>} Objek data invoice yang berhasil dibuat.
 * @throws {Error} Jika terjadi kegagalan saat membuat invoice.
 */
async function createInvoice(amount, userId, userTelegramUsername) {
  try {
    // Payload (data) yang akan dikirim dalam body request POST.
    const payload = {
      // Username dari .env, sesuai kebutuhan gateway.
      username: config.paymentGateway.username,
      // Jumlah nominal pembayaran.
      amount: amount,
      // Catatan yang akan terlampir pada invoice, berguna untuk identifikasi saat callback.
      notes: `Topup Saldo untuk User ID: ${userId} (@${userTelegramUsername})`
    };
    
    // Mengirim request POST ke endpoint '/api/v2/invoices'.
    const response = await apiClient.post('/api/v2/invoices', payload);

    writeLog(`[PaymentGateway] Invoice berhasil dibuat untuk UserID ${userId}: ${response.data.id}`);
    // Mengembalikan data dari respons jika berhasil.
    return response.data;

  } catch (error) {
    // Menangani error jika request gagal.
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    writeLog(`[PaymentGateway] FATAL: Gagal membuat invoice untuk UserID ${userId}: ${errorMsg}`);
    // Melemparkan error baru agar bisa ditangkap oleh handler yang memanggil fungsi ini.
    throw new Error('Gagal terhubung ke server pembayaran.');
  }
}

/**
 * Mengambil gambar QRIS untuk sebuah invoice.
 * @param {string} invoiceId ID unik dari invoice.
 * @returns {Promise<Buffer>} Buffer data gambar dalam format PNG.
 * @throws {Error} Jika gagal mengambil gambar QRIS.
 */
async function getInvoiceQR(invoiceId) {
  try {
    // Mengirim request GET ke endpoint spesifik untuk mendapatkan QRIS.
    const response = await apiClient.get(`/api/v2/invoices/qris/${invoiceId}`, {
      // Penting: responseType 'arraybuffer' memberitahu axios untuk menerima data biner (gambar).
      responseType: 'arraybuffer'
    });
    // Mengonversi data biner mentah menjadi Buffer Node.js.
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    writeLog(`[PaymentGateway] FATAL: Gagal mengambil QRIS untuk Invoice ${invoiceId}: ${errorMsg}`);
    throw new Error('Gagal memuat gambar QRIS.');
  }
}

// Mengekspor fungsi-fungsi agar bisa digunakan di file lain, terutama di topupHandler.
module.exports = {
  createInvoice,
  getInvoiceQR
};
