module.exports = {
  MerchantID: process.env.ECPAY_MERCHANT_ID, // 測試：2000132
  HashKey: process.env.ECPAY_HASH_KEY,       // 測試：5294y06JbISpM5x9
  HashIV: process.env.ECPAY_HASH_IV,         // 測試：v77hoKGq4kWxNNIS
  ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL || 'https://你的測試網址/api/logistics/reply', // 記得設成 Render 上對應的網址
  ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL || 'https://你的測試網址/thankyou.html',       // 物流完成後導回頁面

  IsCollection: 'N', // 是否代收貨款：Y 或 N
  LogisticsSubType: 'UNIMART', // 超商類型（7-11：UNIMART / 全家：FAMI）
  GoodsAmount: 100, // 測試金額，之後可依訂單動態調整
  GoodsName: '春枝測試商品',
  SenderName: '春枝',
  SenderPhone: '0911222333',
  ReceiverStoreID: '991182', // 請用測試店號（7-11：991182；全家：F014702）
  ReceiverName: '測試收件人',
  ReceiverPhone: '0911333444',
};