const crypto = require('crypto');
const qs = require('querystring');

const config = {
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  MerchantID: process.env.ECPAY_MERCHANT_ID
};

// AES 加密
function aesEncrypt(data, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 產出完整 HTML 表單
function create_mpg_aes_encrypt(data) {
  const tradeInfoStr = qs.stringify(data);
  const encryptedTradeInfo = aesEncrypt(tradeInfoStr, config.HashKey, config.HashIV).toLowerCase();
  const shaSource = `HashKey=${config.HashKey}&${encryptedTradeInfo}&HashIV=${config.HashIV}`;
  const tradeSha = crypto.createHash('sha256').update(shaSource).digest('hex').toUpperCase();

  return `
    <form id="ecpay-form" method="post" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" style="display: none;">
      <input type="hidden" name="MerchantID" value="${config.MerchantID}" />
      <input type="hidden" name="TradeInfo" value="${encryptedTradeInfo}" />
      <input type="hidden" name="TradeSha" value="${tradeSha}" />
      <input type="hidden" name="Version" value="${data.Version}" />
    </form>
    <script>document.getElementById('ecpay-form').submit();</script>
  `;
}

module.exports = {
  create_mpg_aes_encrypt
};