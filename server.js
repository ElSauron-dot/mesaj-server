// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAX_HISTORY = 1500;
let messageHistory = []; // { name, text, time }
const clients = new Map(); // name -> ws

function broadcastJSON(obj, exceptWs = null) {
  const json = JSON.stringify(obj);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN && ws !== exceptWs) {
      ws.send(json);
    }
  }
}

function sendMembersUpdate() {
  const members = Array.from(clients.keys());
  broadcastJSON({ type: "members", members });
}

wss.on("connection", (ws) => {
  console.log("Yeni WS bağlantısı");

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { console.error("JSON parse hatası", e); return; }

    // Kayıt (register)
    if (data.type === "register") {
      const name = String(data.name || "").trim();
      if (!name) {
        ws.send(JSON.stringify({ type: "register", ok: false, reason: "İsim boş" }));
        ws.close();
        return;
      }
      if (clients.has(name)) {
        ws.send(JSON.stringify({ type: "register", ok: false, reason: "İsim kullanımda" }));
        ws.close();
        return;
      }
      ws._name = name;
      clients.set(name, ws);
      // Gönder: başarı + geçmiş + üye listesi
      ws.send(JSON.stringify({ type: "register", ok: true }));
      ws.send(JSON.stringify({ type: "history", messages: messageHistory }));
      sendMembersUpdate();
      console.log(`${name} kayıt oldu.`);
      return;
    }

    // Sohbet mesajı
    if (data.type === "chat") {
      const name = ws._name || data.name || "Anon";
      const text = String(data.text || "");
      const time = data.time || Date.now();
      const msg = { type: "chat", name, text, time };
      messageHistory.push({ name, text, time });
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
      broadcastJSON(msg);
      return;
    }

    // Temizle
    if (data.type === "clear") {
      messageHistory = [];
      broadcastJSON({ type: "clear" });
      return;
    }

    // WebRTC sinyalleme: forward target'a (gönderen hariç)
    if (data.type === "signal") {
      const target = data.target;
      if (!target) {
        ws.send(JSON.stringify({ type: "signal", signalType: "error", message: "target eksik" }));
        return;
      }
      const targetWs = clients.get(target);
      if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "signal", signalType: "error", message: "Hedef çevrimdışı", target }));
        return;
      }
      // Forward: include 'from' (gönderen ismi)
      const forward = Object.assign({}, data, { from: ws._name || null });
      // send only to target
      targetWs.send(JSON.stringify(forward));
      return;
    }

    // Diğer tipler
    console.warn("Bilinmeyen type:", data.type);
  });

  ws.on("close", () => {
    if (ws._name && clients.has(ws._name)) {
      clients.delete(ws._name);
      console.log(`${ws._name} bağlantısı kesildi`);
      sendMembersUpdate();
    }
  });

  ws.on("error", (e) => {
    console.error("WS error:", e);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server listening on", PORT));
