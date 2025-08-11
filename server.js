// server.js
const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server listening on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Yeni kullanıcı bağlandı.');

  ws.on('message', function incoming(message) {
    console.log('Gelen mesaj:', message);

    // Gelen mesajı diğer tüm bağlı kullanıcılara gönder
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Kullanıcı ayrıldı.');
  });
});
