// server.js
const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server listening on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Yeni kullanıcı bağlandı.');

  ws.on('message', function incoming(message) {
    console.log('Gelen mesaj:', message);

    // Mesajı tüm bağlı kullanıcılara (gönderene dahil) gönder
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Kullanıcı ayrıldı.');
  });
});
