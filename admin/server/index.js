require('dotenv').config();
const express = require('express');
const path = require('node:path');
const os = require('node:os');
const testRoutes = require('./routes/test');

const app = express();
const PORT = process.env.PORT || 3010;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', testRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`관리자 웹앱 실행 중: http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  (같은 Wi-Fi에서) http://${net.address}:${PORT}`);
      }
    }
  }
});
