// utils/logger.js
const { pool } = require('../database');

// 取得使用者 IP：優先使用 x-forwarded-for，其次 fallback 至 socket IP
function getClientIP(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || null;
}

// 紀錄使用者行為到 logs 資料表
async function logAction({ req, action, target, status, message }) {
  try {
    // 從 req.user 中取得 userId（若不存在或非整數則存 null）
    const userId = Number.isInteger(req?.user?.id) ? req.user.id : null;

    // 限制字數避免超過資料表定義長度
    const safeTarget = typeof target === 'string' ? target.slice(0, 255) : null;
    const safeMessage = typeof message === 'string' ? message.slice(0, 1000) : null;

    // 抓取 IP 與使用者裝置資訊
    const ipAddress = getClientIP(req);
    const userAgent = req?.headers?.['user-agent'] || null;

    // 寫入 logs 資料表
    await pool.query(
      `INSERT INTO logs (user_id, action, target, status, message, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        action || 'unknown',
        safeTarget,
        status || 'unknown',
        safeMessage,
        ipAddress,
        userAgent
      ]
    );
  } catch (err) {
    console.error('❌ 寫入 log 失敗:', err.message);
  }
}

module.exports = { logAction, getClientIP };