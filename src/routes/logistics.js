const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

// ✅ 建立 SDK client
const logistics = new ECPayLogistics();
const createClient = logistics.create_client;
const queryClient = logistics.query_client;

// ✅ 小工具函式：強制轉字串
const safe = (v) => (v != null ? String(v) : '');

// ✅ 建立物流訂單（FAMI 全家 B2C 模式）
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    // ✅ 正確格式的 MerchantTradeDate
    const date = new Date();
    const MerchantTradeDate = date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '/');

    const base_param = {
      MerchantID: safe(process.env.PAY_MERCHANT_ID),
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate,
      LogisticsType: "CVS",
      LogisticsSubType: "FAMI",
      GoodsAmount: safe(parseInt(total) || 0),
      CollectionAmount: "0",
      IsCollection: "N",
      GoodsName: safe(itemName),
      SenderName: "春枝",
      SenderPhone: "0222222222",
      SenderCellPhone: "0911222333",
      ReceiverName: safe(name),
      ReceiverPhone: "0222222222",
      ReceiverCellPhone: safe(phone),
      ReceiverEmail: "test@example.com",
      TradeDesc: "全家 B2C 測試",
      ServerReplyURL: safe(process.env.ECPAY_LOGISTICS_REPLY_URL),
      ClientReplyURL: safe(process.env.ECPAY_LOGISTICS_CLIENT_URL),
      LogisticsC2CReplyURL: safe(process.env.ECPAY_CVS_STORE_REPLY_URL),
      Remark: "",
      PlatformID: "",
      ReceiverStoreID: safe(storeID),
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
    AllPayLogisticsID: safe(AllPayLogisticsID),
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

// ✅ 導向綠界超商地圖選店
router.get('/cvs-map', (req, res) => {
  const map_param = {
    MerchantID: safe(process.env.PAY_MERCHANT_ID),
    LogisticsType: 'CVS',
    LogisticsSubType: 'FAMI',
    IsCollection: 'N',
    ServerReplyURL: safe(process.env.ECPAY_CVS_STORE_REPLY_URL),
  };

  const html = createClient.cvs_map(map_param);
  res.send(html);
});

// ✅ 接收門市回傳
router.post('/cvs-store-reply', (req, res) => {
  const storeInfo = req.body;
  console.log("🏪 門市資訊已回傳：", storeInfo);
  res.redirect(`/store-selected?storeID=${storeInfo.CVSStoreID}&storeName=${storeInfo.CVSStoreName}`);
});

module.exports = router;