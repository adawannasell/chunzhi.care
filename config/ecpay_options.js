module.exports = {
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  OperationMode: 'Test',            // ✅ 必填：Test 或 Production
  IgnorePayment: [],                // ✅ 必填：可以是空陣列
  IsProjectContractor: false,       // ✅ 必填：專案協力廠商 false 為預設
  EncryptType: 1                    // ✅ 必填：1 表 AES
};