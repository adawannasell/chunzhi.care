// utils/ecpay.js
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js'); // 📦 你需要安裝這個套件
const ECPayPayment = require('ecpay_aio_nodejs');

// ✅ 同步讀取並解析 payment_conf.xml（預設放在專案根目錄的 conf/ 下）
const xmlPath = path.join(__dirname, '..', 'conf', 'payment_conf.xml');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');

let options;

xml2js.parseString(xmlContent, (err, result) => {
  if (err) throw new Error('XML parse error: ' + err);

  const profile = result.Conf.MercProfile[0]; // 例：Stage_Account
  const merchantList = result.Conf.MerchantInfo[0].MInfo;

  const merchant = merchantList.find((m) => m.$.name === profile);
  if (!merchant) throw new Error(`找不到商店設定：${profile}`);

  options = {
    MerchantID: merchant.MerchantID[0],
    HashKey: merchant.HashKey[0],
    HashIV: merchant.HashIV[0],
    OperationMode: result.Conf.OperatingMode[0],
    EncryptType: 1
  };
});

// ✅ 傳入解析出來的設定
const ecpayClient = new ECPayPayment(options).payment_client();

function createPaymentHtml(data) {
  return ecpayClient.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };