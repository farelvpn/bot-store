// src/services/serverService.js

/**
 * Service ini bertanggung jawab untuk mengelola file-file konfigurasi server VPN
 * yang disimpan dalam format JSON di dalam direktori /servers.
 * Setiap file .json merepresentasikan satu server.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { writeLog } = require('../utils/logger');

// Path ke direktori tempat file konfigurasi server disimpan.
const SERVERS_DIR = config.paths.serversConfigDir;

// Memastikan direktori /servers ada saat aplikasi pertama kali dijalankan.
if (!fs.existsSync(SERVERS_DIR)) {
  fs.mkdirSync(SERVERS_DIR, { recursive: true });
}

/**
 * Mengambil daftar semua server yang tersedia.
 * @returns {Array<Object>} Sebuah array berisi objek data dari setiap server.
 */
function getAllAvailableServers() {
  try {
    // Membaca semua file di dalam direktori /servers.
    const serverFiles = fs.readdirSync(SERVERS_DIR)
      // Filter untuk hanya mengambil file yang berakhiran .json.
      .filter(file => file.endsWith('.json'));

    const servers = serverFiles.map(file => {
      // Membaca konten setiap file.
      const serverData = JSON.parse(fs.readFileSync(path.join(SERVERS_DIR, file), 'utf-8'));
      // Menambahkan 'id' server (yang merupakan nama file tanpa .json) ke dalam objek.
      serverData.id = path.parse(file).name;
      return serverData;
    });

    return servers;
  } catch (error) {
    writeLog(`[ServerService] ERROR: Gagal membaca daftar server: ${error.message}`);
    return []; // Mengembalikan array kosong jika terjadi error.
  }
}

/**
 * Mendapatkan detail konfigurasi dari satu server berdasarkan ID-nya.
 * @param {string} serverId ID server (nama file tanpa .json).
 * @returns {Object|null} Objek konfigurasi server, atau null jika tidak ditemukan.
 */
function getServerDetails(serverId) {
  const serverFilePath = path.join(SERVERS_DIR, `${serverId}.json`);
  if (fs.existsSync(serverFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(serverFilePath, 'utf-8'));
    } catch (error) {
      writeLog(`[ServerService] ERROR: Gagal membaca file server ${serverId}.json: ${error.message}`);
      return null;
    }
  }
  return null; // Server tidak ditemukan.
}

/**
 * Menambah atau memperbarui file konfigurasi sebuah server.
 * @param {string} serverId ID server.
 * @param {Object} serverData Data konfigurasi server yang akan disimpan.
 * @returns {boolean} `true` jika berhasil, `false` jika gagal.
 */
function saveServerDetails(serverId, serverData) {
  const serverFilePath = path.join(SERVERS_DIR, `${serverId}.json`);
  try {
    // Menulis objek JavaScript ke file sebagai string JSON yang terformat.
    fs.writeFileSync(serverFilePath, JSON.stringify(serverData, null, 2));
    writeLog(`[ServerService] Konfigurasi server ${serverId} berhasil disimpan.`);
    return true;
  } catch (error) {
    writeLog(`[ServerService] ERROR: Gagal menyimpan konfigurasi server ${serverId}: ${error.message}`);
    return false;
  }
}

/**
 * Menghapus file konfigurasi sebuah server.
 * @param {string} serverId ID server yang akan dihapus.
 * @returns {boolean} `true` jika berhasil, `false` jika gagal.
 */
function deleteServer(serverId) {
  const serverFilePath = path.join(SERVERS_DIR, `${serverId}.json`);
  if (fs.existsSync(serverFilePath)) {
    try {
      // Menghapus file dari sistem.
      fs.unlinkSync(serverFilePath);
      writeLog(`[ServerService] Server ${serverId} berhasil dihapus.`);
      return true;
    } catch (error) {
      writeLog(`[ServerService] ERROR: Gagal menghapus server ${serverId}: ${error.message}`);
      return false;
    }
  }
  writeLog(`[ServerService] Gagal menghapus: Server ${serverId} tidak ditemukan.`);
  return false;
}

module.exports = {
  getAllAvailableServers,
  getServerDetails,
  saveServerDetails,
  deleteServer,
};
