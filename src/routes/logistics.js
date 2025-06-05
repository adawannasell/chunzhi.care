const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

const logistics = new ECPayLogistics();
const createClient = logistics.create_client;
const queryClient = logistics.query_client;

const safe = (v) => (v != null ? String(v) : '');

const isValidChineseName = (name) => /^[\u4e00-\u9fa5]{2,5}$/.test(name);

// ✅ 建立物流訂單（FAMI 全家 B2C 模式）
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    if (!isValidChineseName(name)) {
      return res.status(400).send('❗ 收件人姓名請輸入 2–5 個中文字');
    }

    const date = new Date();
    const MerchantTradeDate = date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

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

// ✅ 導向綠界超商地圖選店（建議前端打這支 GET）
router.get('/cvs-map', (req, res) => {
  const MerchantTradeNo = 'MAP' + Date.now();

  res.send(`
    <form id="cvsMapForm" method="POST" action="https://logistics-stage.ecpay.com.tw/Express/map">
      <input type="hidden" name="MerchantID" value="${safe(process.env.PAY_MERCHANT_ID)}" />
      <input type="hidden" name="MerchantTradeNo" value="${MerchantTradeNo}" />
      <input type="hidden" name="LogisticsType" value="CVS" />
      <input type="hidden" name="LogisticsSubType" value="FAMI" />
      <input type="hidden" name="IsCollection" value="N" />
      <input type="hidden" name="ServerReplyURL" value="${safe(process.env.ECPAY_CVS_STORE_REPLY_URL)}" />
      <input type="hidden" name="ClientReplyURL" value="${safe(process.env.ECPAY_LOGISTICS_CLIENT_URL)}" />
    </form>
    <script>document.getElementById('cvsMapForm').submit();</script>
  `);
});

// ✅ 接收門市回傳
router.post('/cvs-store-reply', (req, res) => {
  const storeInfo = req.body;
  console.log("🏪 門市資訊已回傳：", storeInfo);
  res.redirect(`/logistics-test.html?storeID=${storeInfo.CVSStoreID}&storeName=${encodeURIComponent(storeInfo.CVSStoreName)}`);
});

// ✅ 綠界物流建單完成後跳轉的感謝頁
router.post('/thankyou', (req, res) => {
  res.send(`
    <h2>✅ 訂單已建立成功</h2>
    <p>感謝您，請留意簡訊與物流通知。</p>
  `);
});

module.exports = router;