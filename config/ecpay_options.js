module.exports = {
  OperationMode: process.env.ECPAY_OPERATION_MODE,
  MercProfile: {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
    HashKey: process.env.ECPAY_HASH_KEY,
    HashIV: process.env.ECPAY_HASH_IV,
  },
  IgnorePayment: process.env.ECPAY_IGNORE_PAYMENT ? process.env.ECPAY_IGNORE_PAYMENT.split(',') : [],
  IsProjectContractor: false,
};