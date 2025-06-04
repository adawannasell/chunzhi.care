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
      LogisticsType: "CVS",
      LogisticsSubType: "FAMI",
      GoodsAmount: parseInt(total),
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
    console.error('❌ 系統錯誤:', error);
    res.status(500).send('🚨 建立物流訂單失敗');
  }
});