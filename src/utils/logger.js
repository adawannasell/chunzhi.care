const { pool } = require('../database');

async function logAction({ userId, action, target, status, message, req }) {
  try {
    // 若 userId 不是整數，存 null
    const safeUserId = Number.isInteger(userId) ? userId : null;

    // 安全過濾 target 和 message，避免長度超限或為 undefined
    const safeTarget = typeof target === 'string' ? target.slice(0, 255) : null;
    const safeMessage = typeof message === 'string' ? message.slice(0, 1000) : null;

    // 取得使用者 IP（優先從 x-forwarded-for）
    const userIp =
      req?.headers?.['x-forwarded-for']?.split(',')[0] ||
      req?.socket?.remoteAddress ||
      null;

    await pool.query(
      `INSERT INTO logs (user_id, action, target, status, message, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        safeUserId,
        action || 'unknown',
        safeTarget,
        status || 'unknown',
        safeMessage,
        userIp,
        req?.headers?.['user-agent'] || null
      ]
    );
  } catch (err) {
    console.error('❌ 寫入 log 失敗:', err.message);
  }
}

module.exports = { logAction };