// routes/logistics.js
const express = require('express');
const router = express.Router();
const ecpay_logistics = require('ecpay-logistics-nodejs');
require('dotenv').config();

const options = {
  MerchantID: process.env.PAY_MERCHANT_ID,
  HashKey: process.env.PAY_HASH_KEY,
  HashIV: process.env.PAY_HASH_IV,
  ServerReplyURL: process.env.PAY_LOGISTICS_REPLY_URL,
  ClientReplyURL: process.env.PAY_LOGISTICS_CLIENT_URL,
  LogisticsSubType: 'OKMart', // 可改：FAMI、UNIMART、HILIFE
};

router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID } = req.body;

    const baseParams = {
      MerchantTradeNo: 'Test' + Date.now(),
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      LogisticsType: 'CVS',
      LogisticsSubType: options.LogisticsSubType,
      GoodsAmount: 100,
      CollectionAmount: 0,
      IsCollection: 'N',
      GoodsName: '測試商品',
      SenderName: '春枝',
      SenderPhone: '0222222222',
      ReceiverName: name,
      ReceiverPhone: phone,
      ReceiverStoreID: storeID,
      ServerReplyURL: options.ServerReplyURL,
      ClientReplyURL: options.ClientReplyURL,
    };

    const create = new ecpay_logistics.CreateCVS(options);
    const html = create.create(baseParams);

    res.send(html);
  } catch (error) {
    console.error('物流訂單建立失敗', error);
    res.status(500).send('物流訂單建立失敗');
  }
});

module.exports = router;