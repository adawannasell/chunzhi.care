const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

const logistics = new ECPayLogistics();
const createClient = logistics.create_client;
const queryClient = logistics.query_client;

const safe = (v) => (v != null ? String(v) : '');
const isValidChineseName = (name) => /^[\u4e00-\u9fa5]{2,5}$/.test(name);

// ✅ 建立物流訂單（支援多家超商）
router.post('/create-order', async (req, res) => {
  try {
    const {
      name,
      phone,
      storeID,
      itemName,
      total,
      logisticsSubType = 'FAMI'
    } = req.body;

    if (!name || !phone || !itemName || !total) {
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
      MerchantID: "2000132",
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate,
      LogisticsType: "CVS",
      LogisticsSubType: safe(logisticsSubType),
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
      TradeDesc: `正式測試：${logisticsSubType}`,
      ServerReplyURL: "https://chunzhi-care.onrender.com/api/logistics/thankyou",
      ClientReplyURL: "https://chunzhi-care.onrender.com/api/logistics/thankyou",
      LogisticsC2CReplyURL: "https://chunzhi-care.onrender.com/api/logistics/cvs-store-reply",
      Remark: "",
      PlatformID: "",
      ReceiverStoreID: safe(storeID || "006598"),
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

// ✅ 選店地圖
router.get('/cvs-map', (req, res) => {
  const subtype = req.query.subtype || 'FAMI';
  const MerchantTradeNo = 'MAP' + Date.now();

  res.send(`
    <form id="cvsMapForm" method="POST" action="https://logistics-stage.ecpay.com.tw/Express/map" target="_blank">
      <input type="hidden" name="MerchantID" value="2000132" />
      <input type="hidden" name="MerchantTradeNo" value="${MerchantTradeNo}" />
      <input type="hidden" name="LogisticsType" value="CVS" />
      <input type="hidden" name="LogisticsSubType" value="${subtype}" />
      <input type="hidden" name="IsCollection" value="N" />
      <input type="hidden" name="ServerReplyURL" value="https://chunzhi-care.onrender.com/api/logistics/cvs-store-reply" />
      <input type="hidden" name="ClientReplyURL" value="https://chunzhi-care.onrender.com/logistics-test.html?subtype=${subtype}" />
    </form>
    <script>document.getElementById('cvsMapForm').submit();</script>
  `);
});

// ✅ 接收門市資訊
router.post('/cvs-store-reply', (req, res) => {
  const storeInfo = req.body;
  const subtype = storeInfo.LogisticsSubType || 'FAMI';

  console.log("🏪 門市資訊已回傳：", storeInfo);

  res.redirect(`/logistics-test.html?storeID=${storeInfo.CVSStoreID}&storeName=${encodeURIComponent(storeInfo.CVSStoreName)}&subtype=${subtype}`);
});

// ✅ 感謝頁 redirect
router.post('/thankyou', (req, res) => {
  const logisticsId = req.body.AllPayLogisticsID || '';
  const paymentNo = req.body.CVSPaymentNo || '';
  const type = req.body.LogisticsSubType || 'FAMI';

  const redirectUrl = `/thankyou.html?logisticsId=${encodeURIComponent(logisticsId)}&paymentNo=${encodeURIComponent(paymentNo)}&type=${encodeURIComponent(type)}`;
  console.log('✅ Redirecting to:', redirectUrl);

  res.redirect(redirectUrl);
});

// ✅ 列印託運單
router.get('/print/:logisticsId/:paymentNo/:type', (req, res) => {
  const { logisticsId, paymentNo, type } = req.params;

  const base_param = {
    AllPayLogisticsID: logisticsId,
    CVSPaymentNo: paymentNo,
    PlatformID: ""
  };

  const fnMap = {
    FAMI: logistics.c2c_process_client.printfamic2corderinfo,
    UNIMART: logistics.c2c_process_client.printunimartc2corderinfo,
    HILIFE: logistics.c2c_process_client.printhilifec2corderinfo
  };

  const fn = fnMap[type] || fnMap.FAMI;
  const result = fn(base_param);

  if (typeof result === 'string') {
    res.send(result);
  } else {
    result
      .then(html => res.send(html))
      .catch(err => res.status(500).send('🚨 列印託運單失敗：' + err.message));
  }
});

// ✅ 查詢物流狀態（修正格式錯誤）
router.get('/status/:logisticsId', (req, res) => {
  const { logisticsId } = req.params;

  const base_param = {
    AllPayLogisticsID: Number(logisticsId),  // ✅ 強制轉數字！
    PlatformID: ""
  };

  const result = queryClient.querylogisticstradeinfo(base_param);

  if (typeof result === 'string') {
    res.send(result);
  } else {
    result
      .then(info => res.json(info))
      .catch(err => res.status(500).send('🚨 查詢物流狀態失敗：' + err.message));
  }
});

module.exports = router;