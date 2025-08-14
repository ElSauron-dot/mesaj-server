// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname)); // index.html ve diğer dosyalar için

io.on('connection', socket => {
    console.log('Yeni bir kullanıcı bağlandı: ' + socket.id);

    socket.on('join-room', roomID => {
        socket.join(roomID);
        socket.to(roomID).emit('user-connected', socket.id);

        socket.on('signal', (data) => {
            io.to(data.to).emit('signal', {
                from: socket.id,
                signal: data.signal
            });
        });

        socket.on('disconnect', () => {
            socket.to(roomID).emit('user-disconnected', socket.id);
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
