// server.js
const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server listening on port ${port}`);

// Mesaj geçmişi (en fazla 1500 mesaj)
let messageHistory = [];

wss.on('connection', (ws) => {
  console.log('Yeni kullanıcı bağlandı.');

  // Bağlanınca geçmiş mesajları gönder
  messageHistory.forEach(msg => {
    ws.send(JSON.stringify(msg));
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Mesaj: ${data.name}: ${data.text}`);

      // Mesajı geçmişe ekle
      messageHistory.push({ name: data.name, text: data.text });
      if (messageHistory.length > 1500) {
        messageHistory.shift(); // En eski mesajı sil
      }

      // Herkese gönder
      const jsonMessage = JSON.stringify({ name: data.name, text: data.text });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(jsonMessage);
        }
      });
    } catch (err) {
      console.error('Mesaj parse hatası:', err);
    }
  });

  ws.on('close', () => console.log('Kullanıcı ayrıldı.'));
});
