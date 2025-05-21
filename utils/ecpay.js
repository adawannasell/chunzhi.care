// utils/ecpay.js

const { ECPayPayment } = require('ecpay_aio_nodejs'); // ✅ 使用解構方式引入 ECPayPayment
const options = require('../config/ecpay_options');

function createPaymentHtml(data) {
  const ecpayClient = new ECPayPayment(options); // ✅ 正確實例化方式
  return ecpayClient.payment_client.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };