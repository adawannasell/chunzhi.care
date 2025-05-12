const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

const ordersFile = path.join(__dirname, 'orders.json');

app.post('/order', (req, res) => {
  const newOrder = req.body;
  let orders = [];

  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile));
  }

  orders.push({ ...newOrder, createdAt: new Date().toISOString() });
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

  res.send('✅ 訂單已送出，感謝您的購買！');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  const password = req.query.p;

  if (password !== 'qwer4567') {
    return res.send(`
      <form method="get">
        <p>請輸入密碼才能查看後台</p>
        <input type="password" name="p" />
        <button type="submit">登入</button>
      </form>
    `);
  }

  fs.readFile(ordersFile, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).send('讀取訂單失敗');
    }

    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch (e) {
      return res.send('<h2>目前沒有任何訂單</h2>');
    }

    // 轉成 HTML 表格
    const html = `
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>訂單後台</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; padding: 10px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>📋 所有訂單 (${orders.length} 筆)</h1>
        <table>
          <tr><th>姓名</th><th>電話</th><th>地址</th><th>下單時間</th></tr>
          ${orders.map(o => `
            <tr>
              <td>${o.name}</td>
              <td>${o.phone}</td>
              <td>${o.address}</td>
              <td>${new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    res.send(html);
  });
});
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});