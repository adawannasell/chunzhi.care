// utils/ecpay.js

const ecpay = require('ecpay_aio_nodejs');
const options = require('../config/ecpay_options');

function createPaymentHtml(data) {
  const ecpayClient = new ecpay.ECPayPayment(options); // ✅ 正確呼叫方式
  return ecpayClient.payment_client.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };