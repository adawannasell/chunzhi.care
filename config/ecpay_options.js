// config/ecpay_options.js

module.exports = {
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  OperationMode: 'Test',     // ✅ 必填：測試用設為 'Test'，上線後改成 'Production'
  EncryptType: 1             // ✅ 必填：1 表示使用 AES 加密
};