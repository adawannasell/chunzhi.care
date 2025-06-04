const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

// ✅ 建立 SDK client
const logistics = new ECPayLogistics();
const createClient = logistics.create_client;
const queryClient = logistics.query_client;

// ✅ 建立物流訂單（FAMI 全家 B2C 模式）
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    const base_param = {
      MerchantID: process.env.PAY_MERCHANT_ID,
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      LogisticsC2CReplyURL: process.env.ECPAY_CVS_STORE_REPLY_URL,
      LogisticsType: "CVS",
      LogisticsSubType: "FAMI",
      GoodsAmount: parseInt(total) || 0,
      CollectionAmount: 0,
      IsCollection: "N",
      GoodsName: itemName,
      SenderName: "春枝",
      SenderPhone: "0222222222",
      SenderCellPhone: "0911222333",
      ReceiverName: name,
      ReceiverPhone: "0222222222",
      ReceiverCellPhone: phone,
      ReceiverEmail: "test@example.com",
      TradeDesc: "全家 B2C 測試",
      ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
      ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
      Remark: "",
      PlatformID: "",
      ReceiverStoreID: storeID,
      ReturnStoreID: ""
    };

    console.log("🚚 建立物流參數:", base_param);

    const html = createClient.create(base_param);

    if (typeof html === 'string') {
      res.send(html);
    } else {
      html
        .then(result => res.send(result))
        .catch(err => {
          console.error('❌ 建立物流表單錯誤:', err);
          res.status(500).send('🚨 建立物流訂單失敗');
        });
    }

  } catch (error) {
    console.error('❌ 建立物流訂單錯誤:', error);
    res.status(500).send('🚨 建立物流訂單失敗');
  }
});

// ✅ 列印交貨便單據
router.post('/print', async (req, res) => {
  const { AllPayLogisticsID } = req.body;

  if (!AllPayLogisticsID) {
    return res.status(400).send('❗ 請提供物流交易編號 AllPayLogisticsID');
  }

  const base_param = {
    AllPayLogisticsID,
    PlatformID: '',
  };

  try {
    const result = await queryClient.printTradeDocument(base_param);
    res.send(result);
  } catch (err) {
    console.error('❌ 列印失敗:', err);
    res.status(500).send('🚨 列印失敗');
  }
});

// ✅ 導向綠界超商地圖選店（用於 C2C 或 FAMI 寄送）
router.get('/cvs-map', (req, res) => {
  const map_param = {
    MerchantID: process.env.PAY_MERCHANT_ID,
    LogisticsType: 'CVS',
    LogisticsSubType: 'FAMI',
    IsCollection: 'N',
    ServerReplyURL: process.env.ECPAY_CVS_STORE_REPLY_URL, // ex: https://yourdomain.com/api/logistics/cvs-store-reply
  };

  const html = createClient.cvs_map(map_param);
  res.send(html); // 自動送出 POST 表單到綠界選店頁
});

// ✅ 接收門市回傳（跳回你前端或存在後端 session）
router.post('/cvs-store-reply', (req, res) => {
  const storeInfo = req.body;
  console.log("🏪 門市資訊已回傳：", storeInfo);

  // ➜ 你可以把 storeInfo 存 session、DB 或直接跳轉帶參數
  res.redirect(`/store-selected?storeID=${storeInfo.CVSStoreID}&storeName=${storeInfo.CVSStoreName}`);
});

module.exports = router;