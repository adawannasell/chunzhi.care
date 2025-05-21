const tradeData = {
  MerchantID: process.env.ECPAY_MERCHANT_ID,
  MerchantTradeNo: 'NO' + Date.now(),
  MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
  PaymentType: 'aio',
  TotalAmount: total,
  TradeDesc: '綠界金流測試付款',
  ItemName: '原味雪Q餅 x1',
  ReturnURL: 'https://chunzhi-care.onrender.com/api/ecpay/callback',
  ClientBackURL: 'https://chunzhi-care.onrender.com/thankyou.html',
  ChoosePayment: 'Credit',
  NeedExtraPaidInfo: 'N',
  Email: email
};