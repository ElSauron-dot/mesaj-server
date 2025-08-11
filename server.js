// server.js
const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let messageHistory = [];

wss.on("connection", (ws) => {
  // Bağlanınca önce geçmişi gönder
  ws.send(JSON.stringify({ type: "history", messages: messageHistory }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // Normal mesaj
      if (data.type === "chat") {
        messageHistory.push({ name: data.name, text: data.text });
        if (messageHistory.length > 1500) messageHistory.shift();

        broadcast(data);
      }
      // Mesaj temizleme
      else if (data.type === "clear") {
        messageHistory = [];
        broadcast({ type: "clear" });
      }
      // WebRTC sinyalleri (arama)
      else if (data.type === "signal") {
        broadcast(data, ws); // Gönderen hariç diğerlerine
      }
    } catch (e) {
      console.error("Mesaj parse edilemedi", e);
    }
  });
});

function broadcast(data, exclude) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(json);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
