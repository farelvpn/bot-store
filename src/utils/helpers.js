// src/utils/helpers.js

/**
 * Kumpulan fungsi utilitas umum.
 */
module.exports = {
  /**
   * Memformat angka menjadi format mata uang Rupiah (IDR).
   * @param {number} number Angka yang akan diformat.
   * @returns {string} String dalam format Rupiah (e.g., "Rp 10.000").
   */
  formatRupiah: (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number || 0);
  },

  /**
   * Membuat objek tombol kembali standar untuk keyboard inline.
   * @param {string} text Teks pada tombol (default: '⬅️ Kembali').
   * @param {string} callback_data Data callback saat tombol ditekan (default: 'back_menu').
   * @returns {object} Objek tombol.
   */
  backButton: (text = '⬅️ Kembali', callback_data = 'back_menu') => {
    return { text, callback_data };
  },

  /**
   * Menghasilkan string garis pemisah untuk mempercantik tampilan pesan.
   * @returns {string} String garis pemisah.
   */
  prettyLine: () => '------------------------------------------',

  /**
   * Menyensor username untuk notifikasi.
   * @param {string} username Username yang akan disensor.
   * @returns {string} Username tersensor (e.g., "us***me").
   */
  censorUsername: (username) => {
    if (!username || username.length < 3) return '***';
    const start = username.slice(0, 2);
    const end = username.slice(-1);
    const censored = '*'.repeat(Math.max(3, username.length - 3));
    return `${start}${censored}${end}`;
  },

  /**
   * Menyensor nominal saldo/harga untuk notifikasi.
   * @param {number} amount Nominal yang akan disensor.
   * @returns {string} Nominal tersensor dalam format Rupiah (e.g., "Rp 5* ***").
   */
  censorBalance: (amount) => {
      const formatted = module.exports.formatRupiah(amount);
      // Mengganti semua digit kecuali yg pertama dengan '*'
      return formatted.replace(/\d/g, (match, offset) => (offset < 4 ? match : '*'));
  }
};
