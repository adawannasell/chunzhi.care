// utils/ecpay.js
const ECPay = require('ecpay_aio_nodejs');
const options = require('../config/ecpay_options.js'); // ✅ 改為 JS 設定

const ecpayClient = new ECPay(options).payment_client();

function createPaymentHtml(data) {
  return ecpayClient.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };