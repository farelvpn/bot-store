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
   * "Membersihkan" string agar aman digunakan dalam mode MarkdownV2 Telegram.
   * Karakter khusus akan di-escape.
   * @param {string} str String yang akan di-escape.
   * @returns {string} String yang aman untuk MarkdownV2.
   */
  escapeMarkdown: (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  },
};
