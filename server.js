const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });
let users = {}; // id -> ws

function broadcastUserList() {
    const userList = Object.keys(users);
    const msg = JSON.stringify({ type: 'user-list', users: userList });
    Object.values(users).forEach(ws => {
        ws.send(msg);
    });
}

wss.on('connection', (ws) => {
    const userId = uuidv4();
    users[userId] = ws;

    // ID gönder
    ws.send(JSON.stringify({ type: 'id', id: userId }));

    // Kullanıcı listesi güncelle
    broadcastUserList();

    ws.on('message', (msg) => {
        let data;
        try { data = JSON.parse(msg); } catch(e){ return; }

        if(data.type === 'join') {
            // kullanıcı zaten eklendi, listeler güncellendi
        } else if(data.type === 'offer' || data.type === 'answer' || data.type === 'ice-candidate') {
            const to = data.to;
            if(users[to]) {
                users[to].send(JSON.stringify({
                    ...data,
                    from: userId
                }));
            }
        }
    });

    ws.on('close', () => {
        delete users[userId];
        broadcastUserList();
    });
});

console.log("WebSocket server çalışıyor: ws://localhost:8080");
