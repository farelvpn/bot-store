// src/handlers/topupHandler.js

/**
 * Handler ini mengelola semua interaksi yang terkait dengan proses topup saldo.
 * Ini mencakup menampilkan menu, meminta input nominal dari pengguna,
 * dan berinteraksi dengan paymentGatewayService untuk membuat invoice dan QRIS.
 */

const userService = require('../services/userService');
const paymentGatewayService = require('../services/paymentGatewayService');
const { writeLog } = require('../utils/logger');
const { formatRupiah, prettyLine, backButton, escapeMarkdown } = require('../utils/helpers');

// Objek untuk melacak pengguna mana yang sedang dalam proses input nominal topup.
const pendingTopupInput = {};

/**
 * Menampilkan menu awal topup dan meminta pengguna memasukkan nominal.
 * @param {object} bot Instance bot Telegram.
 * @param {object} query Objek callback query dari Telegram.
 */
async function handleTopupMenu(bot, query) {
    const userId = query.from.id.toString();
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    const topupSettings = userService.getTopupSettings();
    const text = `*💳 Topup Saldo Otomatis*\n${prettyLine()}\n` +
                 `Silakan ketik dan kirim jumlah nominal yang ingin Anda topup di chat.\n\n` +
                 `*Contoh:* \`50000\`\n\n` +
                 `Minimal: *${formatRupiah(topupSettings.minAmount)}*\n` +
                 `Maksimal: *${formatRupiah(topupSettings.maxAmount)}*`;

    try {
        await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[backButton('⬅️ Batalkan', 'back_menu')]] }
        });
        // Menandai bahwa pengguna ini sekarang sedang ditunggu inputnya.
        pendingTopupInput[userId] = { active: true, messageId, chatId };
    } catch (error) {
        writeLog(`[TopupHandler] Gagal menampilkan menu topup: ${error.message}`);
    }
}

/**
 * Memproses pesan yang berisi nominal topup dari pengguna.
 * @param {object} bot Instance bot Telegram.
 * @param {object} msg Objek pesan dari Telegram.
 */
async function processTopupAmount(bot, msg) {
    const userId = msg.from.id.toString();
    const username = msg.from.username;
    const state = pendingTopupInput[userId];
    if (!state) return; // Keluar jika pesan ini bukan input yang ditunggu.

    // Hapus status pending agar tidak diproses lagi.
    delete pendingTopupInput[userId];
    const { messageId, chatId } = state;

    // Membersihkan input pengguna dan mengonversinya menjadi angka.
    const amount = parseInt(msg.text.trim().replace(/\D/g, ''));

    // Hapus pesan input dari pengguna dan pesan menu sebelumnya untuk kebersihan.
    await bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
    await bot.deleteMessage(chatId, messageId).catch(() => {});

    // Validasi nominal.
    const { minAmount, maxAmount } = userService.getTopupSettings();
    if (isNaN(amount) || amount < minAmount || amount > maxAmount) {
        const errorText = `❌ *Input Tidak Valid*\n\nNominal harus di antara ${formatRupiah(minAmount)} dan ${formatRupiah(maxAmount)}.`;
        await bot.sendMessage(chatId, errorText, { /* ... opsi error ... */ });
        return;
    }

    // Kirim pesan "sedang memproses" agar pengguna tahu bot sedang bekerja.
    const processingMessage = await bot.sendMessage(chatId, '⏳ Sedang membuat invoice pembayaran, mohon tunggu...');

    try {
        // Memanggil service untuk membuat invoice di payment gateway.
        const invoice = await paymentGatewayService.createInvoice(amount, userId, username);
        // Memanggil service untuk mendapatkan gambar QRIS dari invoice yang baru dibuat.
        const qrBuffer = await paymentGatewayService.getInvoiceQR(invoice.id);

        const caption = `*✅ Silakan Lakukan Pembayaran*\n\n` +
                        `Invoice ID: \`${escapeMarkdown(invoice.id)}\`\n` +
                        `Nominal: *${formatRupiah(amount)}*\n\n` +
                        `*PENTING*: Saldo akan ditambahkan secara otomatis setelah pembayaran berhasil.\n\n` +
                        `_Jika saldo tidak bertambah dalam 5 menit, hubungi Customer Service._`;

        // Hapus pesan "sedang memproses".
        await bot.deleteMessage(chatId, processingMessage.message_id).catch(() => {});
        // Kirim foto QRIS dengan caption detail pembayaran.
        await bot.sendPhoto(chatId, qrBuffer, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[backButton('Selesai & Kembali ke Menu', 'back_menu')]]
            }
        });

    } catch (error) {
        // Menangani jika terjadi error saat berkomunikasi dengan payment gateway.
        await bot.editMessageText(`❌ *Terjadi Kesalahan*\n\n${escapeMarkdown(error.message)}`, {
            chat_id: chatId,
            message_id: processingMessage.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[backButton('Kembali ke Menu', 'back_menu')]] }
        });
    }
}

module.exports = {
  handleTopupMenu,
  processTopupAmount,
  pendingTopupInput
};
