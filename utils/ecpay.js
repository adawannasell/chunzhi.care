// utils/ecpay.js
const ECPayPayment = require('ecpay_aio_nodejs');

// ✅ 不再手動傳入 options，直接使用 XML 設定
const ecpayClient = new ECPayPayment().payment_client();

/**
 * 根據傳入的訂單資料，產出 ECPay 的付款 HTML 表單
 * @param {Object} data - 訂單參數物件
 * @returns {string} HTML 表單字串
 */
function createPaymentHtml(data) {
  return ecpayClient.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };