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
請根據以下八字命格，分析命主特質並推薦一款十天干對應的洗髮餅，包含性格描述與產品形象。

八字命格：
年柱：${bazi.year}
月柱：${bazi.month}
日柱：${bazi.day}
${bazi.hasHour ? `時柱：${bazi.hour}` : '（⚠️ 無出生時辰，僅三柱分析）'}

請依照以下格式輸出：
【推薦洗髮餅】：（例如：甲性洗髮餅）
【命主性格】：（40字內，生動描述命格氣質）
【產品描述】：（產品靈感、香氣與感受，具品牌感，60字內）
`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: '你是一位結合命理、調香與產品設計的洗髮餅推薦顧問，熟悉八字十天干與品牌語言。請以品牌定位的語氣回應，精煉、感性、具有畫面感。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    res.json({ recommendation: response.choices[0].message.content });
  } catch (err) {
    console.error('❌ GPT 回應錯誤：', err);
    res.status(500).json({ error: '推薦失敗，請稍後再試。' });
  }
});

module.exports = router;