const ecpay = require('ecpay_aio_nodejs');
const options = require('../config/ecpay_options');

function createPaymentHtml(data) {
  const ecpayClient = new ecpay(); // ✅ 修正：正確使用 SDK 寫法
  return ecpayClient.aio_check_out_all(data, options);
}

module.exports = { createPaymentHtml };