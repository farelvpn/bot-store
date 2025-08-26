// src/bot.js

/**
 * Ini adalah file utama (entry point) dari aplikasi bot Telegram.
 * Tugasnya adalah:
 * 1. Memuat konfigurasi dari .env.
 * 2. Menginisialisasi objek bot menggunakan library node-telegram-bot-api.
 * 3. Menjalankan server webhook untuk menerima update dari Telegram dan callback dari payment gateway.
 * 4. Mendaftarkan listener utama untuk event 'message' dan 'callback_query'.
 * 5. Mendelegasikan tugas ke handler yang sesuai berdasarkan input pengguna.
 */

// Memastikan konfigurasi dimuat paling awal
require('dotenv').config();

// Impor library-library yang diperlukan
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { writeLog } = require('./utils/logger');
const { setupWebhookListener } = require('./handlers/webhookHandler');

// Validasi kritis: Hentikan bot jika konfigurasi penting tidak ada.
if (!config.botToken || !config.webhook.url || !config.adminId) {
    writeLog("FATAL: BOT_TOKEN, WEBHOOK_URL, dan ADMIN_USER_ID harus diatur di file .env");
    process.exit(1); // Menghentikan proses Node.js dengan kode error
}

// Inisialisasi bot. Polling tidak diaktifkan karena kita menggunakan webhook.
const bot = new TelegramBot(config.botToken);

// Menjalankan server Express yang akan mendengarkan update dari Telegram
// dan secara otomatis mendaftarkan webhook bot.
setupWebhookListener(bot);

// Impor service dan handler yang akan digunakan.
const userService = require('./services/userService');
const { processTopupAmount, pendingTopupInput } = require('./handlers/topupHandler');
const { handleBroadcastInput, handleAddServerInput, handleEditServerInput, pendingAdminAction } = require('./handlers/adminHandler');
const { routeCallbackQuery } = require('./handlers/callbackRouter');

// Listener utama untuk semua pesan teks yang masuk.
bot.on('message', async (msg) => {
    // Abaikan pesan dari grup atau channel, bot hanya merespon di chat pribadi.
    if (msg.chat.type !== 'private') return;

    // Ekstrak informasi penting dari pesan.
    const userId = msg.from.id.toString();
    const username = msg.from.username || `user${userId}`;

    // Pastikan pengguna terdaftar di database sebelum memproses lebih lanjut.
    // Ini dilewati untuk command /start agar pengguna baru bisa mendaftar.
    if (!msg.text || !msg.text.startsWith('/start')) {
        userService.ensureUser(userId, username);
    }
  
    // Cek apakah ada proses yang sedang menunggu input dari pengguna ini.
    // Contoh: bot sedang menunggu jumlah nominal topup.
    if (pendingTopupInput[userId]?.active) {
        return processTopupAmount(bot, msg);
    }
    // Cek apakah ada aksi admin yang sedang menunggu input.
    if (pendingAdminAction[userId]) {
        const action = pendingAdminAction[userId].action;
        if (action === 'broadcast_input') return handleBroadcastInput(bot, msg);
        if (action.startsWith('add_server_input')) return handleAddServerInput(bot, msg);
        if (action === 'edit_server_input') return handleEditServerInput(bot, msg);
        // Tambahkan handler untuk aksi admin lainnya di sini.
    }

    // Jika pesan adalah teks dan bukan input yang ditunggu, proses sebagai command atau menu.
    if (msg.text) {
        if (msg.text.startsWith('/start')) {
            const { handleStartCommand } = require('./handlers/coreHandler');
            return handleStartCommand(bot, msg);
        }
        if (msg.text.startsWith('/admin')) {
             const { handleAdminPanelMain } = require('./handlers/adminHandler');
             // Membuat objek 'query' palsu agar handler bisa digunakan oleh command dan callback.
             return handleAdminPanelMain(bot, { from: msg.from, message: msg });
        }
    }
  
    // Jika tidak ada kondisi di atas yang terpenuhi, anggap sebagai interaksi biasa
    // dan tampilkan menu utama.
    const { sendMainMenu } = require('./handlers/coreHandler');
    await sendMainMenu(bot, userId, msg.chat.id, null);
});

// Listener untuk semua event callback_query (ketika pengguna menekan tombol inline).
bot.on('callback_query', (query) => {
    // Semua callback akan diarahkan ke router untuk diproses.
    routeCallbackQuery(bot, query);
});

// Menangani error yang spesifik terjadi pada webhook.
bot.on('webhook_error', (err) => writeLog(`Webhook Error: ${err.message}`));

// Pesan log yang menandakan bot berhasil dijalankan.
writeLog(`Bot "${config.storeName}" berhasil dimulai dalam mode Webhook.`);
