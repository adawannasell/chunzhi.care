module.exports = {
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  OperationMode: 'Test',        // ✅ 'Test' or 'Production'
  EncryptType: 1,               // ✅ 1 = AES
  MercProfile: 'TestMerchant'   // ✅ 指定 SDK 使用哪組設定（預設的測試用帳號）
};