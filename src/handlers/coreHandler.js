// src/handlers/coreHandler.js

/**
 * Handler ini mengelola interaksi inti dan navigasi utama pengguna.
 * Ini termasuk perintah awal seperti /start dan fungsi untuk menampilkan
 * menu utama bot.
 */

const userService = require('../services/userService');
const serverService = require('../services/serverService');
const config = require('../config');
const { formatRupiah, prettyLine, backButton, escapeMarkdown } = require('../utils/helpers');
const { writeLog } = require('../utils/logger');
const os = require('os');

/**
 * Menangani perintah /start.
 * Mendaftarkan pengguna jika baru dan menampilkan menu utama.
 * @param {object} bot Instance bot Telegram.
 * @param {object} msg Objek pesan dari Telegram.
 */
async function handleStartCommand(bot, msg) {
  const userId = msg.from.id.toString();
  const username = msg.from.username;

  // Mendaftarkan pengguna. Jika pengguna baru, kirim pesan selamat datang.
  const isNewUser = userService.ensureUser(userId, username);
  if (isNewUser) {
    await bot.sendMessage(userId, 'Selamat datang! Akun Anda telah berhasil dibuat.');
  }
  
  // Menampilkan menu utama.
  await sendMainMenu(bot, userId, msg.chat.id);
}

/**
 * Merakit dan mengirim pesan menu utama kepada pengguna.
 * @param {object} bot Instance bot Telegram.
 * @param {string} userId ID pengguna.
 * @param {string} chatId ID obrolan.
 * @param {number|null} messageIdToEdit Jika ada, pesan ini akan diedit, bukan dikirim sebagai pesan baru.
 */
async function sendMainMenu(bot, userId, chatId, messageIdToEdit = null) {
  try {
    const user = userService.getUser(userId);
    const allServers = serverService.getAllAvailableServers();
    
    // Menghitung uptime bot.
    const uptimeSec = os.uptime();
    const uptimeH = Math.floor(uptimeSec / 3600);
    const uptimeM = Math.floor((uptimeSec % 3600) / 60);
    const uptimeStr = `${uptimeH}j ${uptimeM}m`;

    // Merakit teks pesan menggunakan template literal.
    const messageText =
      `🛒 *${escapeMarkdown(config.storeName)}*\n${prettyLine()}\n` +
      `*Statistik Bot:*\n` +
      `• 🗄️ Server Tersedia: *${allServers.length}*\n` +
      `• ⏱️ Uptime: *${uptimeStr}*\n` +
      `${prettyLine()}\n` +
      `*Akun Anda:*\n` +
      `• 🆔 ID: \`${userId}\`\n` +
      `• 👤 Username: @${escapeMarkdown(user.username || 'tidak_ada')}\n` +
      `• 💰 Saldo: *${formatRupiah(user.balance)}*\n` +
      `${prettyLine()}\n` +
      `Silakan pilih menu di bawah ini:`;

    // Merakit keyboard inline.
    const inline_keyboard = [
      [
        { text: '🛡️ Menu VPN', callback_data: 'menu_vpn' },
        { text: '💳 Topup Saldo', callback_data: 'topup_menu' }
      ],
      [
        { text: '📦 Menu Lainnya', callback_data: 'menu_lain' }
      ]
    ];
    
    // Tambahkan tombol Panel Admin jika pengguna adalah admin.
    if (user.role === 'admin') {
      inline_keyboard.push([{ text: '👑 Panel Admin', callback_data: 'admin_panel_main' }]);
    }

    const options = {
      chat_id: chatId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    };

    // Jika ada messageIdToEdit, edit pesan yang ada. Jika tidak, kirim pesan baru.
    if (messageIdToEdit) {
      await bot.editMessageText(messageText, { ...options, message_id: messageIdToEdit });
    } else {
      await bot.sendMessage(chatId, messageText, options);
    }
  } catch (error) {
    writeLog(`[CoreHandler] ERROR di sendMainMenu: ${error.message}`);
  }
}

module.exports = {
  handleStartCommand,
  sendMainMenu
};
