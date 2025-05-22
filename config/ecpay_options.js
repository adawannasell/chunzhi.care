module.exports = {
  OperationMode: 'Test',           // 'Test' or 'Production'
  MercProfile: 'Stage_Account',    // ✅ 官方 SDK 必填（你現在就是缺這個）
  IsProjectContractor: 'N',
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  EncryptType: 1
};