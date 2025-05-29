// routes/email.js
const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/send-confirmation-email', async (req, res) => {
  const { to, name, orderInfo } = req.body;

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // 免費版目前只能用這個寄件人
      to,
      subject: '感謝您的訂購',
      html: `
        <h2>親愛的 ${name}，您好：</h2>
        <p>感謝您的訂購！這是您的訂單摘要：</p>
        <pre>${orderInfo}</pre>
        <p>我們會盡快處理並與您聯絡，如有問題請回覆此信。</p>
        <br />
        <p>— 愛妲生活</p>
      `,
    });

    if (error) return res.status(500).json({ error });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;