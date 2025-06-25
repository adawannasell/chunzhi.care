const { pool } = require('../database');

// 取得使用者 IP：優先使用 x-forwarded-for，其次 fallback 至 socket IP
function getClientIP(req) {
  return req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || req?.ip
    || req?.socket?.remoteAddress
    || null;
}

async function logAction({ req, action, target, status, message }) {
  try {
    // 從 req.user 中自動取得 userId
    const userId = Number.isInteger(req?.user?.id) ? req.user.id : null;

    // 安全過濾 target 與 message 字數，避免超過 DB 限制
    const safeTarget = typeof target === 'string' ? target.slice(0, 255) : null;
    const safeMessage = typeof message === 'string' ? message.slice(0, 1000) : null;

    // 提取 IP 與 User-Agent
    const userIp = getClientIP(req);
    const userAgent = req?.headers?.['user-agent'] || null;

    // 寫入 PostgreSQL logs 表
    await pool.query(
      `INSERT INTO logs (user_id, action, target, status, message, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        action || 'unknown',
        safeTarget,
        status || 'unknown',
        safeMessage,
        userIp,
        userAgent
      ]
    );
  } catch (err) {
    console.error('❌ 寫入 log 失敗:', err.message);
  }
}

module.exports = { logAction };