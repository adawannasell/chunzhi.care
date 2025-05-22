// utils/ecpay.js
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const ECPayPayment = require('ecpay_aio_nodejs');

const xmlPath = path.join(__dirname, '..', 'conf', 'payment_conf.xml');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');

let options;

xml2js.parseString(xmlContent, (err, result) => {
  if (err) {
    console.error('[ECPay ERROR] XML parse error:', err);
    throw new Error('XML parse error');
  }

  const profile = result.Conf.MercProfile?.[0];
  const merchants = result.Conf.MerchantInfo?.[0]?.MInfo || [];

  const merchant = merchants.find(m => m.$.name === profile);
  if (!merchant) {
    console.error('[ECPay ERROR] 找不到指定的商店設定:', profile);
    throw new Error('Missing Merchant profile in payment_conf.xml');
  }

  options = {
    MerchantID: merchant.MerchantID[0],
    HashKey: merchant.HashKey[0],
    HashIV: merchant.HashIV[0],
    OperationMode: result.Conf.OperatingMode?.[0] || 'Test',
    MercProfile: profile,
    EncryptType: 1
  };
});

// ✅ 建立 ECPay client（這裡必須用 setTimeout 確保 parse 完畢才使用）
let ecpayClient;
setTimeout(() => {
  if (!options) {
    console.error('[ECPay ERROR] options 尚未準備好');
    process.exit(1);
  }
  ecpayClient = new ECPayPayment(options).payment_client();
}, 100); // 延遲 100ms 等 XML 解析完成

function createPaymentHtml(data) {
  if (!ecpayClient) {
    throw new Error('ECPay client 尚未初始化完成，請稍後再試');
  }
  return ecpayClient.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };