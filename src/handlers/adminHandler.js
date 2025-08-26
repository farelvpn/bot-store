// src/handlers/adminHandler.js

/**
 * Handler ini mengelola semua fungsionalitas panel admin. Ini mencakup
 * berbagai tindakan seperti mengelola pengguna, server, pengaturan,
 * dan mengirim broadcast. Karena banyak aksi admin memerlukan input
 * multi-langkah, handler ini sangat bergantung pada objek `pendingAdminAction`
 * untuk melacak status percakapan dengan admin.
 */

const userService = require('../services/userService');
const serverService = require('../services/serverService');
const { writeLog } = require('../utils/logger');
const { prettyLine, backButton, escapeMarkdown, formatRupiah } = require('../utils/helpers');

// Objek global untuk melacak aksi admin yang sedang menunggu input.
// Kunci adalah userId admin, nilainya adalah objek status.
const pendingAdminAction = {};

/**
 * Memeriksa apakah pengguna adalah admin.
 * @param {string} userId ID pengguna.
 * @returns {boolean} `true` jika admin, `false` jika bukan.
 */
function isAdmin(userId) {
  const user = userService.getUser(userId);
  return user && user.role === 'admin';
}

/**
 * Menampilkan menu utama panel admin.
 * @param {object} bot Instance bot.
 * @param {object} query Objek query atau pesan dari Telegram.
 */
async function handleAdminPanelMain(bot, query) {
  const userId = query.from.id.toString();
  if (!isAdmin(userId)) return; // Validasi akses admin.

  const text = `👑 *Panel Admin Utama*\n${prettyLine()}\nPilih tindakan yang ingin Anda lakukan:`;
  const keyboard = [
    [{ text: '👤 Kelola Pengguna', callback_data: 'admin_manage_users' }],
    [{ text: '🗄️ Kelola Server VPN', callback_data: 'admin_manage_servers' }],
    [{ text: '📢 Broadcast Pesan', callback_data: 'admin_broadcast_prompt' }],
    // Tambahkan menu lain di sini jika perlu.
    [backButton('⬅️ Kembali ke Menu', 'back_menu')]
  ];

  await bot.editMessageText(text, {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

// --- FUNGSI MANAJEMEN SERVER (CRUD) ---

/**
 * Menampilkan menu untuk manajemen server (Tambah, Edit, Hapus).
 */
async function handleManageServersMenu(bot, query) {
  if (!isAdmin(query.from.id.toString())) return;
  const text = `*🗄️ Kelola Server VPN*\n${prettyLine()}\nPilih aksi yang ingin Anda lakukan.`;
  const keyboard = [
    [{ text: '➕ Tambah Server Baru', callback_data: 'admin_add_server_prompt' }],
    [{ text: '✏️ Edit Server', callback_data: 'admin_edit_server_select' }],
    [{ text: '❌ Hapus Server', callback_data: 'admin_delete_server_select' }],
    [backButton('⬅️ Kembali', 'admin_panel_main')]
  ];
  await bot.editMessageText(text, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

/**
 * Menampilkan daftar server untuk dipilih (untuk diedit atau dihapus).
 * @param {string} action Aksi yang akan dilakukan ('edit' atau 'delete').
 */
async function handleSelectServer(bot, query, action) {
    if (!isAdmin(query.from.id.toString())) return;
    const servers = serverService.getAllAvailableServers();
    if (servers.length === 0) {
        await bot.answerCallbackQuery(query.id, { text: `Tidak ada server untuk di${action}.`, show_alert: true });
        return;
    }
    const callbackPrefix = action === 'edit' ? 'admin_edit_server_details' : 'admin_delete_server_confirm';
    const keyboard = servers.map(server => ([{ text: server.name, callback_data: `${callbackPrefix}_${server.id}` }]));
    keyboard.push([backButton('⬅️ Batal', 'admin_manage_servers')]);
    await bot.editMessageText(`✏️ *Pilih Server* yang ingin Anda ${action}:`, { chat_id: query.message.chat.id, message_id: query.message.message_id, reply_markup: { inline_keyboard: keyboard } });
}


/**
 * Menampilkan detail server yang bisa diedit.
 */
async function handleEditServerDetails(bot, query) {
    if (!isAdmin(query.from.id.toString())) return;
    const serverId = query.data.split('_').pop();
    const server = serverService.getServerDetails(serverId);
    if (!server) return;
    
    const text = `*✏️ Edit Server: ${escapeMarkdown(server.name)}*\n\nPilih properti yang ingin diubah:`;
    const keyboard = [
        [{ text: `Nama Tampilan`, callback_data: `admin_edit_prop_name_${serverId}` }],
        [{ text: `Domain/Endpoint`, callback_data: `admin_edit_prop_domain_${serverId}` }],
        [{ text: 'Token API', callback_data: `admin_edit_prop_token_${serverId}` }],
        [backButton('⬅️ Kembali', 'admin_edit_server_select')]
    ];
    await bot.editMessageText(text, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

/**
 * Meminta input baru dari admin untuk properti server yang dipilih.
 */
async function handleEditServerPropPrompt(bot, query) {
    const adminId = query.from.id.toString();
    if (!isAdmin(adminId)) return;
    
    const parts = query.data.split('_');
    const property = parts[3]; // 'name', 'domain', 'token'
    const serverId = parts[4];
    
    // Menyimpan status aksi ke `pendingAdminAction`.
    pendingAdminAction[adminId] = { action: 'edit_server_input', property, serverId, messageId: query.message.message_id, chatId: query.message.chat.id };
    
    const propLabels = { name: 'Nama Tampilan Baru', domain: 'Domain/Endpoint Baru', token: 'API Token Baru' };
    const text = `📝 Masukkan *${propLabels[property]}* untuk server \`${serverId}\`.`;
    await bot.editMessageText(text, {
        chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[backButton('🚫 Batal', `admin_edit_server_details_${serverId}`) ]]}
    });
}

/**
 * Memproses input dari admin untuk mengubah data server.
 */
async function handleEditServerInput(bot, msg) {
    const adminId = msg.from.id.toString();
    const state = pendingAdminAction[adminId];
    if (!state || state.action !== 'edit_server_input') return;

    const { property, serverId, messageId, chatId } = state;
    const newValue = msg.text.trim();
    
    delete pendingAdminAction[adminId]; // Selesaikan aksi.
    await bot.deleteMessage(chatId, msg.message_id).catch(() => {}); // Hapus input admin.

    const server = serverService.getServerDetails(serverId);
    if (server) {
        server[property] = newValue; // Perbarui properti yang sesuai.
        serverService.saveServerDetails(serverId, server); // Simpan perubahan.
        writeLog(`[Admin] Server ${serverId} properti ${property} diubah oleh ${adminId}`);
        await bot.editMessageText(`✅ Properti server berhasil diperbarui.`, {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [[backButton('Kembali Edit', `admin_edit_server_details_${serverId}`), backButton('Selesai', 'admin_manage_servers')]] }
        });
    } else {
        await bot.editMessageText(`❌ Gagal menyimpan, server tidak ditemukan.`, { chat_id: chatId, message_id: messageId, /* ... */ });
    }
}

/**
 * Mengkonfirmasi dan menghapus server.
 */
async function handleDeleteServerConfirm(bot, query) {
    if (!isAdmin(query.from.id.toString())) return;
    const serverId = query.data.split('_').pop();
    const server = serverService.getServerDetails(serverId);
    if (!server) return;
    
    serverService.deleteServer(serverId);
    writeLog(`[Admin] Server ${serverId} (${server.name}) dihapus oleh ${query.from.id}`);
    
    await bot.editMessageText(`✅ Server *${escapeMarkdown(server.name)}* (ID: \`${serverId}\`) telah berhasil dihapus.`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[backButton('Kembali', 'admin_manage_servers')]] }
    });
}


// Tambahkan fungsi untuk Tambah Server dan Broadcast di sini jika diperlukan.
// Strukturnya akan mirip dengan alur Edit Server.


module.exports = {
  handleAdminPanelMain,
  handleManageServersMenu,
  handleSelectServer,
  handleEditServerDetails,
  handleEditServerPropPrompt,
  handleEditServerInput,
  handleDeleteServerConfirm,
  // ... ekspor fungsi lain ...
  pendingAdminAction
};
