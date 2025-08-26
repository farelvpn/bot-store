// src/services/notificationService.js

/**
 * Service ini bertanggung jawab untuk memformat dan mengirim pesan notifikasi
 * kepada pengguna atau admin. Memusatkan logika notifikasi di sini
 * membuat pesan menjadi konsisten dan mudah diubah di satu tempat.
 */

const config = require('../config');
const { formatRupiah, escapeMarkdown } = require('../utils/helpers');
const { writeLog } = require('../utils/logger');

/**
 * Mengirim notifikasi ke pengguna bahwa topup mereka berhasil.
 * @param {object} bot Instance bot Telegram.
 * @param {string} userId ID pengguna yang akan dikirimi notifikasi.
 * @param {number} amount Jumlah topup.
 * @param {number} newBalance Saldo baru pengguna setelah topup.
 */
async function sendTopupSuccessNotification(bot, userId, amount, newBalance) {
  try {
    const message = `✅ *Topup Berhasil!*\n\n` +
                    `Sejumlah *${formatRupiah(amount)}* telah berhasil ditambahkan ke saldo Anda.\n\n` +
                    `Saldo Anda sekarang: *${formatRupiah(newBalance)}*`;
    
    // Mengirim pesan ke pengguna.
    await bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    // Menangani error jika bot diblokir oleh pengguna, dll.
    writeLog(`[Notification] Gagal mengirim notifikasi topup ke User ID ${userId}: ${error.message}`);
  }
}

/**
 * Mengirim notifikasi ke admin bahwa ada topup baru yang masuk.
 * @param {object} bot Instance bot Telegram.
 * @param {string} userId ID pengguna yang melakukan topup.
 * @param {string} username Username pengguna.
 * @param {number} amount Jumlah topup.
 */
async function sendAdminTopupNotification(bot, userId, username, amount) {
  try {
    const message = `🔔 *Notifikasi Topup Baru*\n\n` +
                    `Pengguna baru saja melakukan topup:\n` +
                    `👤 **Username:** @${escapeMarkdown(username || 'tidak_ada')}\n` +
                    `🆔 **ID:** \`${userId}\`\n` +
                    `💰 **Jumlah:** *${formatRupiah(amount)}*`;

    // Mengirim pesan ke admin utama yang diatur di .env.
    await bot.sendMessage(config.adminId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    writeLog(`[Notification] Gagal mengirim notifikasi topup ke Admin: ${error.message}`);
  }
}

module.exports = {
  sendTopupSuccessNotification,
  sendAdminTopupNotification,
};
