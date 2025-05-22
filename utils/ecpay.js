// utils/ecpay.js
const ECPayPayment = require('ecpay_aio_nodejs');
const options = require('../config/ecpay_options'); // ✅ 引入你自己寫的 options 設定檔

function createPaymentHtml(data) {
  const ecpayClient = new ECPayPayment(options); // ✅ 傳入 options
  return ecpayClient.payment_client.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };