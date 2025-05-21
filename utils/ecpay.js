const ecpay = require('ecpay_aio_nodejs');
const options = require('../config/ecpay_options');

function createPaymentHtml(data) {
  const ecpayClient = new ecpay();
  return ecpayClient.payment_client.aio_check_out_all(data, options);
}

module.exports = { createPaymentHtml };