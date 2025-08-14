// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static(__dirname));

const rooms = {}; // Oda listesi ve kullanıcılar

io.on('connection', socket => {
    console.log('Yeni kullanıcı bağlandı: ' + socket.id);

    // Oda oluştur
    socket.on('create-room', (callback) => {
        const roomID = 'ROOM-' + Math.random().toString(36).substring(2,8).toUpperCase();
        rooms[roomID] = [];
        callback({ roomID });
    });

    // Odaya katıl
    socket.on('join-room', (roomID, callback) => {
        if (!rooms[roomID]) return callback({ success: false });

        socket.join(roomID);
        rooms[roomID].push(socket.id);

        // Katıldığını diğer kullanıcılara bildir
        socket.to(roomID).emit('user-connected', socket.id);
        io.to(socket.id).emit('joined-room', roomID);
        callback({ success: true });

        // Mesajlaşma
        socket.on('message', ({ room, text }) => {
            io.to(room).emit('message', { user: socket.id, text });
        });

        // WebRTC sinyalleme
        socket.on('signal', data => {
            io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
        });

        // Ayrılma
        socket.on('disconnect', () => {
            socket.to(roomID).emit('user-disconnected', socket.id);
            if (rooms[roomID]) {
                rooms[roomID] = rooms[roomID].filter(u => u !== socket.id);
                if (rooms[roomID].length === 0) delete rooms[roomID];
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`MiniGameChat sunucusu ${PORT} portunda çalışıyor`));
