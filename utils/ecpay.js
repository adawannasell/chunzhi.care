// utils/ecpay.js
const ECPayPayment = require('ecpay_aio_nodejs');

// ✅ 回歸預設，不傳入任何 config，讓 SDK 自動從 conf/payment_conf.xml 讀取
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