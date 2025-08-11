// server.js
const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server listening on port ${port}`);

wss.on('connection', (ws) => {
  console.log('Yeni kullanıcı bağlandı.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Mesaj: ${data.name}: ${data.text}`);

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
