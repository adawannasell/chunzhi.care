module.exports = {
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  OperationMode: 'Test',     // 或 'Production' 正式上線用
  EncryptType: 1
};