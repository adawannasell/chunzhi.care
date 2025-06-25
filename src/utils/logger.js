const { pool } = require('../database');

async function logAction({ userId, action, target, status, message, req }) {
  try {
    const safeUserId = Number.isInteger(userId) ? userId : null;

    await pool.query(
      `INSERT INTO logs (user_id, action, target, status, message, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        safeUserId,
        action,
        target || null,
        status || null,
        message || null,
        req?.ip || null,
        req?.headers['user-agent'] || null
      ]
    );
  } catch (err) {
    console.error('❌ 寫入 log 失敗:', err);
  }
}

module.exports = { logAction };