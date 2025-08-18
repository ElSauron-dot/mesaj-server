const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.get("/", (req, res) => res.send("NeoChat🎮 Server Aktif!"));

// Bağlı kullanıcılar
let users = {};

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  // Nick ile katıl
  socket.on("join", (nick) => {
    users[socket.id] = nick;
    console.log(`${nick} katıldı`);
    // Tüm kullanıcılara duyur
    io.emit("chat", { nick: "SYSTEM", msg: `${nick} aramaya katıldı.` });
  });

  // Sohbet mesajı
  socket.on("chat", (data) => {
    io.emit("chat", data);
  });

  // WebRTC sinyalleme
  socket.on("ready", () => {
    console.log(users[socket.id], "hazır");
  });

  socket.on("offer", (data) => {
    socket.to(data.to).emit("offer", { from: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    socket.to(data.to).emit("answer", { from: socket.id, answer: data.answer });
  });

  socket.on("candidate", (data) => {
    socket.to(data.to).emit("candidate", { from: socket.id, candidate: data.candidate });
  });

  // Çıkış
  socket.on("disconnect", () => {
    const nick = users[socket.id];
    delete users[socket.id];
    console.log(`${nick} ayrıldı`);
    io.emit("chat", { nick: "SYSTEM", msg: `${nick} aramadan ayrıldı.` });
  });
});

// Render için port
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("NeoChat🎮 server çalışıyor:", PORT));
