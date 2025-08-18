const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.get("/", (req, res) => res.send("Server çalışıyor"));

let users = {};

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("join", (nick) => {
    users[socket.id] = nick;
    io.emit("userlist", Object.values(users));
    console.log(nick, "katıldı");
  });

  socket.on("chat", (data) => {
    io.emit("chat", data);
  });

  // WebRTC sinyalleme
  socket.on("ready", () => {
    for (let id in users) {
      if (id !== socket.id) {
        socket.to(id).emit("offer", { from: socket.id, offer: null });
      }
    }
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

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("userlist", Object.values(users));
  });
});

server.listen(10000, () => console.log("Server 10000 portunda çalışıyor"));
