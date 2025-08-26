// src/services/vpnApiService.js
const axios = require('axios');
const { writeLog } = require('../utils/logger');
const crypto = require('crypto');

function getApiClient(server) {
    return axios.create({
        baseURL: server.domain,
        headers: {
            'Authorization': `Bearer ${server.api_token}`,
            'Content-Type': 'application/json'
        }
    });
}

async function createAccount(server, protocol, username, password) {
    const apiClient = getApiClient(server);
    let endpoint = '';
    let payload = {};
    const masaAktif = 30;

    switch (protocol) {
        case 'ssh': endpoint = '/api/addssh'; payload = { username, password, masa: masaAktif }; break;
        case 'vmess': endpoint = '/api/add-vmess'; payload = { user: username, masaaktif: masaAktif }; break;
        case 'vless': endpoint = '/api/add-vless'; payload = { user: username, masaaktif: masaAktif }; break;
        case 'trojan': endpoint = '/api/add-trojan'; payload = { user: username, masaaktif: masaAktif }; break;
        case 'ss': endpoint = '/api/add-ss'; payload = { user: username, masaaktif: masaAktif }; break;
        case 's5': endpoint = '/api/add-s5'; payload = { username, password, masaaktif: masaAktif }; break;
        default: throw new Error(`Protokol "${protocol}" tidak didukung.`);
    }

    try {
        const response = await apiClient.post(endpoint, payload);
        if (response.data.status !== "true" && response.data.code !== 200) {
            throw new Error(response.data.message || 'Gagal membuat akun di server.');
        }

        writeLog(`[VpnApiService] Akun ${protocol} dibuat: ${username} di server ${server.name}`);
        const formattedDetails = formatAccountDetails(protocol, response.data, server.name);
        const trxId = crypto.randomBytes(8).toString('hex');
        return {
            details: formattedDetails,
            password: response.data.password || password,
            trx_id: `${protocol}-${trxId}`
        };
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        writeLog(`[VpnApiService] FATAL: Gagal createAccount ${username}: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

async function renewAccount(server, protocol, username) {
    const apiClient = getApiClient(server);
    let endpoint = '';
    const payload = { username, days: 30 };

    switch (protocol) {
        case 'ssh': endpoint = '/api/renew-ssh'; break;
        case 'vmess': endpoint = '/api/renew-vmess'; break;
        case 'vless': endpoint = '/api/renew-vless'; break;
        case 'trojan': endpoint = '/api/renew-trojan'; break;
        case 'ss': endpoint = '/api/renew-ss'; break;
        case 's5': endpoint = '/api/renew-s5'; break;
        default: throw new Error(`Protokol "${protocol}" tidak bisa diperpanjang.`);
    }

    try {
        const response = await apiClient.post(endpoint, payload);
         if (response.data.status === "false" || response.status !== 200) {
            throw new Error(response.data.message || 'Gagal memperpanjang akun di server.');
        }
        writeLog(`[VpnApiService] Akun ${protocol} diperpanjang: ${username} di server ${server.name}`);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        writeLog(`[VpnApiService] FATAL: Gagal renewAccount ${username}: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

function formatAccountDetails(protocol, data, serverName) {
    let details = `
✅ <b>Akun Berhasil Dibuat</b>
------------------------------------------
<b>Server:</b> ${serverName}
<b>Protokol:</b> ${protocol.toUpperCase()}
<b>Username:</b> <code>${data.user || data.username}</code>
`;

    if (data.password) details += `<b>Password:</b> <code>${data.password}</code>\n`;
    if (data.domain) details += `<b>Domain/Host:</b> <code>${data.domain}</code>\n`;
    if (data.uuid) details += `<b>UUID:</b> <code>${data.uuid}</code>\n`;
    if (data.https) details += `<b>Port TLS:</b> <code>${data.https}</code>\n`;
    if (data.http) details += `<b>Port Non-TLS:</b> <code>${data.http}</code>\n`;
    if (data.path) details += `<b>Path:</b> <code>${data.path}</code>\n`;
    if (data.expiration_date || data.expired_on) {
        details += `<b>Masa Aktif Hingga:</b> <code>${data.expiration_date || data.expired_on}</code>\n`;
    }

    details += `------------------------------------------`;

    if (data.links) {
        details += `\n\n<b>👇 Klik untuk menyalin konfigurasi 👇</b>\n`;
        for (const [key, value] of Object.entries(data.links)) {
            details += `\n<b>${key.toUpperCase()}:</b>\n<code>${value}</code>\n`;
        }
    }
    
    details += `\nTerima kasih telah membeli!`;
    return details;
}

module.exports = { createAccount, renewAccount };
