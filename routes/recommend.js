// routes/recommend.js
const express = require('express');
const router = express.Router();
const { getBaziFromDate } = require('../utils/getBaziFromDate');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/recommend', async (req, res) => {
  const { year, month, day, hour } = req.body;
  try {
    const bazi = getBaziFromDate({ year, month, day, hour });

    const prompt = `
客戶的八字如下：
年柱：${bazi.year}
月柱：${bazi.month}
日柱：${bazi.day}
${bazi.hasHour ? `時柱：${bazi.hour}` : '⚠️ 客戶未提供出生時辰，此為三柱分析'}

請根據這個命格特質推薦：
1. 頭皮性格與氣質描述（40字內）
2. 洗髮餅的建議功效
3. 推薦的配方（中藥、精油、顏色）
4. 療癒系洗髮餅商品文案（80字內）
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: '你是一位結合命理與香氛設計的洗髮餅推薦師。' },
        { role: 'user', content: prompt }
      ]
    });

    res.json({ recommendation: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.json({ error: '推薦失敗，請稍後再試。' });
  }
});

module.exports = router;