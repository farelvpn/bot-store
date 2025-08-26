// src/handlers/adminHandler.js

/**
 * Handler ini mengelola semua fungsionalitas panel admin. Ini mencakup
 * berbagai tindakan seperti mengelola pengguna, server, pengaturan,
 * dan mengirim broadcast. Karena banyak aksi admin memerlukan input
 * multi-langkah, handler ini sangat bergantung pada objek `pendingAdminAction`
 * untuk melacak status percakapan dengan admin.
 */

// Impor service dan utilitas yang diperlukan.
const userService = require('../services/userService');
const serverService = require('../services/serverService');
const sqliteService = require('../services/sqliteService'); // Untuk melihat transaksi.
const { writeLog } = require('../utils/logger');
const { prettyLine, backButton, escapeMarkdown, formatRupiah } = require('../utils/helpers');

// Objek global untuk melacak aksi admin yang sedang menunggu input.
// Kunci adalah userId admin, nilainya adalah objek status.
const pendingAdminAction = {};

// Daftar konstanta protokol untuk mempermudah penambahan server.
const VPN_PROTOCOLS = [
    { id: 'ssh', name: 'SSH' },
    { id: 'vmess', name: 'VMess' },
    { id: 'vless', name: 'VLess' },
    { id: 'trojan', name: 'Trojan' },
    { id: 'noobzvpn', name: 'NoobzVPN' },
];

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
    [{ text: '📜 Lihat Transaksi', callback_data: 'admin_view_transactions' }],
    [backButton('⬅️ Kembali ke Menu', 'back_menu')]
  ];

  await bot.editMessageText(text, {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

// --- MANAJEMEN PENGGUNA ---

/**
 * Menampilkan menu untuk manajemen pengguna.
 */
async function handleManageUsers(bot, query) {
    if (!isAdmin(query.from.id.toString())) return;
    const text = `*👤 Kelola Pengguna*\n${prettyLine()}\nPilih aksi yang ingin Anda lakukan.`;
    const keyboard = [
        [{ text: '➕ Tambah Saldo Manual', callback_data: 'admin_add_balance_prompt' }],
        [{ text: '👑 Ubah Peran Pengguna', callback_data: 'admin_set_role_prompt' }],
        [backButton('⬅️ Kembali', 'admin_panel_main')]
    ];
    await bot.editMessageText(text, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

/**
 * Memulai alur penambahan saldo manual.
 */
async function handleAddBalancePrompt(bot, query) {
    const adminId = query.from.id.toString();
    if (!isAdmin(adminId)) return;
    pendingAdminAction[adminId] = { action: 'add_balance_input', step: 'userid', messageId: query.message.message_id, chatId: query.message.chat.id };
    await bot.editMessageText('💰 *Tambah Saldo Manual*\n\nKirimkan *User ID* dari pengguna yang saldonya ingin Anda tambah.', {
        chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[backButton('Batal', 'admin_manage_users')]] }
    });
}

// --- FUNGSI MANAJEMEN SERVER (CRUD LENGKAP) ---

async function handleManageServersMenu(bot, query) {
    /* ... (sudah ada di respons sebelumnya) ... */
}
async function handleSelectServer(bot, query, action) {
    /* ... (sudah ada di respons sebelumnya) ... */
}
async function handleEditServerDetails(bot, query) {
    /* ... (sudah ada di respons sebelumnya) ... */
}
async function handleEditServerPropPrompt(bot, query) {
    /* ... (sudah ada di respons sebelumnya) ... */
}
async function handleEditServerInput(bot, msg) {
    /* ... (sudah ada di respons sebelumnya) ... */
}
async function handleDeleteServerConfirm(bot, query) {
    /* ... (sudah ada di respons sebelumnya) ... */
}


/**
 * Memulai alur penambahan server baru.
 */
async function handleAddServerPrompt(bot, query) {
    const adminId = query.from.id.toString();
    if (!isAdmin(adminId)) return;
    // Memulai alur dengan meminta 'id' server.
    pendingAdminAction[adminId] = { action: 'add_server_input', step: 'id', serverData: {}, messageId: query.message.message_id, chatId: query.message.chat.id };
    await bot.editMessageText(
        '➕ *Tambah Server Baru (Langkah 1/5)*\n\n' +
        'Kirimkan *ID unik* untuk server baru (contoh: `sg-vultr`, hanya huruf kecil, angka, dan strip). ' +
        'ID ini tidak dapat diubah dan digunakan sebagai nama file.',
        {
            chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[backButton('Batal', 'admin_manage_servers')]] }
        }
    );
}

/**
 * Memproses semua input multi-langkah untuk menambah atau mengedit.
 * @param {object} bot Instance bot.
 * @param {object} msg Objek pesan dari admin.
 */
async function handleAddServerInput(bot, msg) {
    const adminId = msg.from.id.toString();
    const state = pendingAdminAction[adminId];
    if (!state || !state.action !== 'add_server_input') return;

    const input = msg.text.trim();
    const { chatId, messageId } = state;
    await bot.deleteMessage(chatId, msg.message_id).catch(() => {}); // Hapus input admin.

    try {
        switch (state.step) {
            case 'id':
                // Validasi ID server.
                if (!/^[a-z0-9-]+$/.test(input) || serverService.getServerDetails(input)) {
                    await bot.answerCallbackQuery(msg.message_id, { text: 'ID tidak valid atau sudah digunakan. Coba lagi.', show_alert: true });
                    return; // Tetap di langkah ini.
                }
                state.serverData.id = input;
                state.step = 'name'; // Lanjut ke langkah berikutnya.
                await bot.editMessageText('*(Langkah 2/5)*\n\nMasukkan *Nama Tampilan Server* (contoh: `SG Vultr 1`).', { chatId, messageId, parse_mode: 'Markdown' });
                break;
            
            case 'name':
                state.serverData.name = input;
                state.step = 'domain';
                await bot.editMessageText('*(Langkah 3/5)*\n\nMasukkan *Domain/Endpoint API* server.', { chatId, messageId, parse_mode: 'Markdown' });
                break;

            case 'domain':
                state.serverData.domain = input;
                state.step = 'token';
                await bot.editMessageText('*(Langkah 4/5)*\n\nMasukkan *API Token* untuk server ini.', { chatId, messageId, parse_mode: 'Markdown' });
                break;
            
            case 'token':
                state.serverData.api_token = input;
                state.serverData.protocols = {};
                state.protocolIndex = 0; // Mulai iterasi protokol.
                state.step = 'price';
                // Meminta harga untuk protokol pertama.
                const firstProto = VPN_PROTOCOLS[0];
                await bot.editMessageText(`*(Langkah 5/${VPN_PROTOCOLS.length+4})*\n\nMasukkan harga untuk *${firstProto.name}* (angka saja, misal: \`15000\`). Ketik \`0\` jika tidak tersedia.`, { chatId, messageId, parse_mode: 'Markdown' });
                break;

            case 'price':
                const price = parseInt(input);
                if (isNaN(price) || price < 0) {
                     await bot.answerCallbackQuery(msg.message_id, { text: 'Harga tidak valid. Masukkan angka saja.', show_alert: true });
                    return; // Tetap di langkah ini.
                }
                
                const currentProto = VPN_PROTOCOLS[state.protocolIndex];
                if (price > 0) {
                    state.serverData.protocols[currentProto.id] = { price_per_30_days: price };
                }

                state.protocolIndex++; // Lanjut ke protokol berikutnya.

                if (state.protocolIndex < VPN_PROTOCOLS.length) {
                    // Masih ada protokol lain, minta harganya.
                    const nextProto = VPN_PROTOCOLS[state.protocolIndex];
                     await bot.editMessageText(`*(Langkah ${state.protocolIndex+5}/${VPN_PROTOCOLS.length+4})*\n\nMasukkan harga untuk *${nextProto.name}* (ketik \`0\` jika tidak ada).`, { chatId, messageId, parse_mode: 'Markdown' });
                } else {
                    // Semua harga protokol sudah dimasukkan. Simpan server.
                    serverService.saveServerDetails(state.serverData.id, state.serverData);
                    delete pendingAdminAction[adminId]; // Selesaikan aksi.
                    await bot.editMessageText(`✅ *Server Berhasil Ditambahkan!*\n\nServer *${escapeMarkdown(state.serverData.name)}* telah disimpan.`, {
                        chatId, messageId, parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: [[backButton('Kembali', 'admin_manage_servers')]] }
                    });
                }
                break;
        }
    } catch (error) {
        writeLog(`[AdminHandler] Error pada alur tambah server: ${error.message}`);
        delete pendingAdminAction[adminId];
        await bot.editMessageText('Terjadi kesalahan. Proses dibatalkan.', { chatId, messageId });
    }
}


// --- FUNGSI BROADCAST ---

async function handleBroadcastPrompt(bot, query) {
    const adminId = query.from.id.toString();
    if (!isAdmin(adminId)) return;
    pendingAdminAction[adminId] = { action: 'broadcast_input', messageId: query.message.message_id, chatId: query.message.chat.id };
    await bot.editMessageText('📢 *Kirim Broadcast*\n\nKirimkan pesan yang ingin Anda siarkan ke semua pengguna. Pesan mendukung format Markdown.', {
        chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[backButton('Batal', 'admin_panel_main')]] }
    });
}

async function handleBroadcastInput(bot, msg) {
    const adminId = msg.from.id.toString();
    const state = pendingAdminAction[adminId];
    if (!state || state.action !== 'broadcast_input') return;
    
    delete pendingAdminAction[adminId];
    const broadcastMessage = msg.text;
    const { chatId, messageId } = state;

    const allUsers = userService.loadDB().users;
    const userIds = Object.keys(allUsers);

    await bot.editMessageText(`⏳ Memulai broadcast ke *${userIds.length}* pengguna...`, { chatId, messageId, parse_mode: 'Markdown' });

    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
        try {
            await bot.sendMessage(userId, broadcastMessage, { parse_mode: 'Markdown' });
            successCount++;
            // Tambahkan jeda kecil untuk menghindari limitasi API Telegram.
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            failCount++;
            writeLog(`[Broadcast] Gagal mengirim ke User ID ${userId}: ${error.code}`);
        }
    }

    const report = `✅ *Broadcast Selesai!*\n\n` +
                   `Berhasil terkirim: *${successCount}*\n` +
                   `Gagal terkirim: *${failCount}*`;
    
    await bot.editMessageText(report, { chatId, messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[backButton('Kembali', 'admin_panel_main')]] } });
}

// --- LIHAT TRANSAKSI ---
async function handleViewTransactions(bot, query) {
    if (!isAdmin(query.from.id.toString())) return;
    const topups = await sqliteService.all('SELECT * FROM topup_logs ORDER BY created_at DESC LIMIT 10');
    
    let text = `*📜 10 Transaksi Topup Terakhir*\n${prettyLine()}\n`;

    if (topups.length === 0) {
        text += '_Belum ada transaksi topup._';
    } else {
        topups.forEach(trx => {
            const date = new Date(trx.created_at).toLocaleString('id-ID');
            text += `*ID Pengguna:* \`${trx.telegram_id}\`\n` +
                    `*Jumlah:* ${formatRupiah(trx.amount)}\n` +
                    `*Invoice:* \`${trx.invoice_id}\`\n` +
                    `*Tanggal:* ${date}\n${prettyLine()}\n`;
        });
    }

    await bot.editMessageText(text, {
        chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[backButton('Kembali', 'admin_panel_main')]] }
    });
}


module.exports = {
  isAdmin,
  handleAdminPanelMain,
  handleManageUsers,
  handleAddBalancePrompt,
  handleManageServersMenu,
  handleSelectServer,
  handleAddServerPrompt,
  handleAddServerInput,
  handleEditServerDetails,
  handleEditServerPropPrompt,
  handleEditServerInput,
  handleDeleteServerConfirm,
  handleBroadcastPrompt,
  handleBroadcastInput,
  handleViewTransactions,
  pendingAdminAction
};
