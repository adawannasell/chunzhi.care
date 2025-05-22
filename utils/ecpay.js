// utils/ecpay.js
const ECPayPayment = require('ecpay_aio_nodejs');

function createPaymentHtml(data) {
  const ecpayClient = new ECPayPayment(); // ❌ 不用傳 options
  return ecpayClient.payment_client.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };