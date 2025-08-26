// src/services/notificationService.js

/**
 * Service ini bertanggung jawab untuk memformat dan mengirim notifikasi
 * ke pengguna atau grup admin.
 */

const config = require('../config');
const { formatRupiah, censorUsername, censorBalance } = require('../utils/helpers');
const { writeLog } = require('../utils/logger');

/**
 * Mengirim notifikasi ke grup yang telah dikonfigurasi.
 * @param {object} bot Instance bot Telegram.
 * @param {string} message Pesan yang akan dikirim.
 */
async function sendNotificationToGroup(bot, message) {
  // Cek apakah notifikasi diaktifkan dan ID grup ada
  if (!config.groupNotification.enabled || !config.groupNotification.chatId) {
    return;
  }

  try {
    const options = {
      parse_mode: 'HTML', // Menggunakan HTML untuk fleksibilitas format
      message_thread_id: config.groupNotification.topicId, // ID Topik/Thread
    };
    await bot.sendMessage(config.groupNotification.chatId, message, options);
  } catch (error) {
    writeLog(`[Notification] Gagal mengirim notifikasi ke grup ${config.groupNotification.chatId}: ${error.message}`);
  }
}

/**
 * Notifikasi untuk topup yang berhasil.
 * @param {object} bot Instance bot.
 * @param {string} userId ID pengguna.
 * @param {string} username Username pengguna.
 * @param {number} amount Jumlah topup.
 */
async function sendTopupSuccessNotification(bot, userId, username, amount) {
  const censoredUser = censorUsername(username || `user${userId}`);
  const censoredAmount = censorBalance(amount);

  const message = `
✅ <b>Topup Saldo Berhasil</b>
------------------------------------------
👤 <b>User:</b> ${censoredUser} (<code>${userId}</code>)
💰 <b>Jumlah:</b> ${censoredAmount}
------------------------------------------
  `;
  await sendNotificationToGroup(bot, message);
}

/**
 * Notifikasi untuk pembelian akun VPN baru.
 * @param {object} bot
 * @param {object} user - Objek pengguna dari Telegram (msg.from).
 * @param {object} purchaseData - Detail pembelian.
 */
async function sendNewVpnPurchaseNotification(bot, user, purchaseData) {
    const { serverName, protocol, username, price } = purchaseData;
    const censoredUser = censorUsername(user.username || `user${user.id}`);
    const censoredPrice = censorBalance(price);

    const message = `
🛒 <b>Pembelian Akun Baru</b>
------------------------------------------
👤 <b>Pembeli:</b> ${censoredUser} (<code>${user.id}</code>)
🗄️ <b>Server:</b> ${serverName}
🛡️ <b>Protokol:</b> ${protocol.toUpperCase()}
🤵 <b>Username:</b> <code>${username}</code>
💸 <b>Harga:</b> ${censoredPrice}
------------------------------------------
    `;
    await sendNotificationToGroup(bot, message);
}

/**
 * Notifikasi untuk perpanjangan akun VPN.
 * @param {object} bot
 * @param {object} user - Objek pengguna dari Telegram (msg.from).
 * @param {object} renewData - Detail perpanjangan.
 */
async function sendVpnRenewNotification(bot, user, renewData) {
    const { serverName, protocol, username, price } = renewData;
    const censoredUser = censorUsername(user.username || `user${user.id}`);
    const censoredPrice = censorBalance(price);

    const message = `
🔄 <b>Perpanjangan Akun</b>
------------------------------------------
👤 <b>Pelanggan:</b> ${censoredUser} (<code>${user.id}</code>)
🗄️ <b>Server:</b> ${serverName}
🛡️ <b>Protokol:</b> ${protocol.toUpperCase()}
🤵 <b>Username:</b> <code>${username}</code>
💸 <b>Biaya:</b> ${censoredPrice}
------------------------------------------
    `;
    await sendNotificationToGroup(bot, message);
}


module.exports = {
  sendTopupSuccessNotification,
  sendNewVpnPurchaseNotification,
  sendVpnRenewNotification
};
