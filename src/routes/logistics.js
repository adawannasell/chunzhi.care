// routes/logistics.js
const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

// ✅ 建立物流 SDK 實例
const logistics = new ECPayLogistics({
  MerchantID: process.env.PAY_MERCHANT_ID,
  HashKey: process.env.PAY_HASH_KEY,
  HashIV: process.env.PAY_HASH_IV,
});

// ✅ 建立物流訂單
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

const base_param = {
  MerchantTradeNo:"SDSD4156s1a56d1asd", // 請帶20碼uid, ex: f0a0d7e9fae1bb72bc93, 為aiocheckout時所產生的
	MerchantTradeDate:"2021/01/27 11:00:45", // 請帶交易時間, ex: 2017/05/17 16:23:45, 為aiocheckout時所產生的
	ogisticsType:"CVS",
	LogisticsSubType:"UNIMARTC2C",//UNIMART、FAMI、HILIFE、UNIMARTC2C、FAMIC2C、HILIFEC2C、OKMARTC2C
  LogisticsType: 'CVS',
	GoodsAmount:"200",
	CollectionAmount:"200",
	IsCollection:"Y",
	GoodsName:"test",
	SenderName:"綠界科技",
	SenderPhone:"29788833",
	SenderCellPhone:"0912345678",
	ReceiverName:"綠界科技",
	ReceiverPhone:"0229768888",
	ReceiverCellPhone:"0912345678",
	ReceiverEmail:"tesy@gmail.com",
	TradeDesc:"",
	ServerReplyURL:"http://192.168.0.1/ReceiverServerReply", // 物流狀況會通知到此URL
	ClientReplyURL:"",
	LogisticsC2CReplyURL:"",
	Remark:"",
	PlatformID:"",
	ReceiverStoreID:"991182", // 請帶收件人門市代號(統一):991182  測試商店代號(全家):001779 測試商店代號(萊爾富):2001、F227
	ReturnStoreID:""
        
      
    };

    console.log('🚚 建立物流訂單參數:', base_param);

    const html = logistics.create_client.create(parameters = base_param);
    if (typeof html === 'string') {
      res.send(html);
    } else {
      html.then(result => res.send(result)).catch(err => {
        console.error('❌ SDK 建立物流錯誤:', err);
        res.status(500).send('🚨 建立物流訂單錯誤');
      });
    }
  } catch (error) {
    console.error('❌ 系統錯誤:', error);
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
    const result = await logistics.query_client.printtradedocument(parameters = base_param);
    res.send(result);
  } catch (err) {
    console.error('❌ 列印失敗:', err);
    res.status(500).send('🚨 列印失敗');
  }
});

// ✅ C2C 狀態通知 callback（必要）
router.post('/c2c', (req, res) => {
  console.log('📦 收到物流狀態通知:', req.body);
  res.send('OK');
});

module.exports = router;