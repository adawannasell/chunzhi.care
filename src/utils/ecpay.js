// utils/ecpay.js
const ECPay = require('ecpay_aio_nodejs');
const options = require('../../config/ecpay_options.js');
const dotenv = require('dotenv');

dotenv.config();

const ecpayClient = new ECPay(options);

function createPaymentHtml(data) {
  return ecpayClient.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };