// utils/ecpay.js
const path = require('path');
const fs = require('fs');
const ECPayPayment = require('ecpay_aio_nodejs');

// ✅ 強制指定 XML 設定檔絕對路徑
const xmlPath = path.join(__dirname, '..', 'conf', 'payment_conf.xml');

// ✅ 印出執行目錄 & XML 設定路徑（Debug 用）
console.log('[DEBUG] CWD:', process.cwd());
console.log('[DEBUG] XML Path:', xmlPath);

// ✅ 檢查檔案是否存在，避免部署錯誤找不到
if (!fs.existsSync(xmlPath)) {
  console.error('[ECPay ERROR] 找不到 payment_conf.xml，請確認 conf/payment_conf.xml 是否存在於專案根目錄');
  throw new Error('Missing payment_conf.xml');
}

// ✅ 傳入 XML 路徑給 SDK
const ecpayClient = new ECPayPayment(xmlPath).payment_client();

/**
 * 根據傳入的訂單資料，產出 ECPay 的付款 HTML 表單
 * @param {Object} data - 訂單參數物件
 * @returns {string} HTML 表單字串
 */
function createPaymentHtml(data) {
  return ecpayClient.aio_check_out_all(data);
}

module.exports = { createPaymentHtml };