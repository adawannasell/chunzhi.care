const crypto = require('crypto');
const qs = require('querystring');

const config = {
  HashKey: process.env.ECPAY_HASH_KEY,
  HashIV: process.env.ECPAY_HASH_IV,
  MerchantID: process.env.ECPAY_MERCHANT_ID,
};

// ✅ 綠界要求 AES-128-CBC 加密，金鑰長度須為 16 bytes
function aesEncrypt(data, key, iv) {
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function sha256(encrypted, key, iv) {
  const plainText = `HashKey=${key}&${encrypted}&HashIV=${iv}`;
  return crypto.createHash('sha256').update(plainText).digest('hex').toUpperCase();
}

function create_mpg_aes_encrypt(data) {
  const tradeInfo = qs.stringify(data); // ✅ 自動 URL encode，避免欄位被忽略
  const encrypted = aesEncrypt(tradeInfo, config.HashKey, config.HashIV).toLowerCase();
  const tradeSha = sha256(encrypted, config.HashKey, config.HashIV);

  return `
    <form id="ecpay-form" method="post" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" style="display: none;">
      <input type="hidden" name="MerchantID" value="${config.MerchantID}" />
      <input type="hidden" name="TradeInfo" value="${encrypted}" />
      <input type="hidden" name="TradeSha" value="${tradeSha}" />
      <input type="hidden" name="Version" value="${data.Version}" />
    </form>
    <script>document.getElementById('ecpay-form').submit();</script>
  `;
}

module.exports = { create_mpg_aes_encrypt };