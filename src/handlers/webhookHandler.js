// src/handlers/webhookHandler.js

/**
 * Handler ini bertanggung jawab untuk menyiapkan server web (menggunakan Express.js)
 * yang diperlukan agar bot dapat berjalan dalam mode webhook. Mode ini jauh lebih efisien
 * daripada polling karena Telegram akan secara proaktif mengirim update ke server kita
 * setiap kali ada interaksi baru.
 */

const express = require('express');
const bodyParser = require('body-parser');
const userService = require('../services/userService');
const notificationService = require('../services/notificationService');
const { writeLog } = require('../utils/logger');
const config = require('../config');

/**
 * Menginisialisasi dan menjalankan server Express.
 * @param {object} bot Instance bot Telegram.
 */
function setupWebhookListener(bot) {
  // Membuat aplikasi Express.
  const app = express();
  // Menggunakan middleware bodyParser untuk secara otomatis mem-parse body request JSON.
  app.use(bodyParser.json());

  // Endpoint #1: Menerima callback dari Payment Gateway.
  // URL ini (misal: https://bot-anda.contoh.com/webhook) harus Anda daftarkan di dashboard gateway.
  app.post('/webhook', (req, res) => {
    const payload = req.body;
    writeLog(`[Webhook] Menerima payload dari Gateway: ${JSON.stringify(payload)}`);

    // Validasi dasar payload: pastikan ada ID, statusnya 'PAID', dan ada 'notes'.
    if (payload.id && payload.status === 'PAID' && payload.notes) {
      // Ekstrak User ID dari catatan invoice menggunakan Regular Expression.
      const userIdMatch = payload.notes.match(/User ID: (\d+)/);
      if (userIdMatch && userIdMatch[1]) {
        const userId = userIdMatch[1];
        const amount = payload.amount;
        const invoiceId = payload.id;

        writeLog(`[Webhook] Pembayaran terkonfirmasi untuk UserID ${userId}, sejumlah ${amount}`);
        // Memanggil userService untuk memperbarui saldo pengguna.
        const { user } = userService.updateUserBalance(userId, amount, 'topup_gateway', { invoiceId });
        
        // Mengirim notifikasi keberhasilan ke pengguna dan admin.
        notificationService.sendTopupSuccessNotification(bot, userId, amount, user.balance);
        notificationService.sendAdminTopupNotification(bot, userId, user.username, amount);

        // Mengirim respons 200 OK untuk memberitahu gateway bahwa callback berhasil diproses.
        res.status(200).send({ status: 'success', message: 'Webhook processed' });
      } else {
        writeLog(`[Webhook] WARNING: Tidak dapat menemukan User ID di notes: ${payload.notes}`);
        res.status(400).send({ status: 'error', message: 'User ID not found in notes' });
      }
    } else {
      writeLog(`[Webhook] Payload dari gateway tidak valid atau status bukan PAID.`);
      res.status(400).send({ status: 'error', message: 'Invalid payload or status not PAID' });
    }
  });

  // Endpoint #2: Menerima update dari Telegram.
  // Telegram akan mengirim semua update (pesan, callback, dll.) ke URL ini.
  app.post(`/bot${config.botToken}`, (req, res) => {
    // Meneruskan update mentah ke library node-telegram-bot-api untuk diproses.
    bot.processUpdate(req.body);
    // Segera kirim respons 200 OK ke Telegram agar tidak terjadi timeout.
    res.sendStatus(200);
  });
  
  // Menjalankan server pada port yang ditentukan di .env.
  app.listen(config.webhook.port, () => {
    writeLog(`[Webhook] Server berjalan dan mendengarkan di port ${config.webhook.port}`);
    
    // Secara otomatis mendaftarkan URL webhook kita ke server Telegram.
    const webhookFullUrl = `${config.webhook.url}/bot${config.botToken}`;
    bot.setWebHook(webhookFullUrl)
      .then(() => {
        writeLog(`[Webhook] Berhasil diatur ke: ${webhookFullUrl}`);
      })
      .catch((error) => {
        // Ini adalah error kritis, kemungkinan besar karena URL tidak dapat diakses publik atau salah.
        writeLog(`[Webhook] FATAL: Gagal mengatur webhook: ${error.message}`);
      });
  });
}

module.exports = {
  setupWebhookListener
};
