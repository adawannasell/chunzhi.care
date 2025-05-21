// config/ecpay_options.js

module.exports = {
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  OperationMode: 'Test',     // ✅ 正確拼寫
  EncryptType: 1
};