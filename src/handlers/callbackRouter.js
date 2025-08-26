// src/handlers/callbackRouter.js

/**
 * File ini berfungsi sebagai router untuk semua callback query yang diterima bot.
 * Ketika seorang pengguna menekan tombol inline, Telegram mengirim sebuah event
 * 'callback_query' dengan data unik. Router ini akan membaca data tersebut
 * dan memanggil fungsi (handler) yang tepat untuk menanganinya.
 * Ini membuat logika utama bot (bot.js) menjadi lebih bersih dan terorganisir.
 */

const { writeLog } = require('../utils/logger');
const { sendMainMenu } = require('./coreHandler');
const { handleTopupMenu } = require('./topupHandler');
const adminHandler = require('./adminHandler');

/**
 * Menerima query dan mengarahkannya ke handler yang sesuai.
 * @param {object} bot Instance bot Telegram.
 * @param {object} query Objek callback_query dari Telegram.
 */
async function routeCallbackQuery(bot, query) {
  // Data unik dari tombol yang ditekan.
  const data = query.data;
  const userId = query.from.id.toString();

  // Mencatat setiap callback untuk keperluan debugging.
  writeLog(`[CallbackRouter] Menerima callback data: "${data}" dari User ID: ${userId}`);

  // Menjawab callback query secepat mungkin untuk menghilangkan ikon loading di tombol.
  await bot.answerCallbackQuery(query.id);

  // === NAVIGASI UTAMA ===
  if (data === 'back_menu') {
    return sendMainMenu(bot, userId, query.message.chat.id, query.message.message_id);
  }
  if (data === 'topup_menu') {
    return handleTopupMenu(bot, query);
  }
  // Tambahkan navigasi menu lain di sini (misal: menu_vpn, menu_lain)

  // === PANEL ADMIN ===
  if (data.startsWith('admin_')) {
    // Menggunakan switch-case untuk menangani berbagai aksi admin.
    switch (data) {
      case 'admin_panel_main':
        return adminHandler.handleAdminPanelMain(bot, query);
      case 'admin_manage_servers':
        return adminHandler.handleManageServersMenu(bot, query);
      case 'admin_edit_server_select':
        return adminHandler.handleSelectServer(bot, query, 'edit');
      case 'admin_delete_server_select':
        return adminHandler.handleSelectServer(bot, query, 'delete');
      // Tambahkan case lain untuk aksi admin.
    }

    // Menangani callback dengan pola dinamis (misal: mengandung ID).
    if (data.startsWith('admin_edit_server_details_')) {
      return adminHandler.handleEditServerDetails(bot, query);
    }
    if (data.startsWith('admin_edit_prop_')) {
      return adminHandler.handleEditServerPropPrompt(bot, query);
    }
    if (data.startsWith('admin_delete_server_confirm_')) {
      return adminHandler.handleDeleteServerConfirm(bot, query);
    }
  }

  // Jika tidak ada handler yang cocok, catat sebagai peringatan.
  writeLog(`[CallbackRouter] WARNING: Tidak ada handler untuk callback data: "${data}"`);
}

module.exports = {
  routeCallbackQuery
};
