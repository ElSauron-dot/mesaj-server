// server.js
const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server running on port ${port}`);

// Mesaj geçmişi (max 1500)
let messageHistory = [];

// Kullanıcı listesi
let users = {};

wss.on('connection', (ws) => {
    let userName = null;

    // Bağlanınca geçmiş mesajları gönder
    ws.send(JSON.stringify({ type: 'history', messages: messageHistory }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join') {
                userName = data.name;
                users[userName] = ws;
                console.log(`${userName} bağlandı.`);
                return;
            }

            if (data.type === 'message') {
                const msgObj = { name: data.name, text: data.text, time: Date.now() };
                messageHistory.push(msgObj);
                if (messageHistory.length > 1500) messageHistory.shift();

                // Herkese gönder
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'message', ...msgObj }));
                    }
                });
            }

            // Sesli arama sinyali
            if (data.type === 'signal' && data.target && users[data.target]) {
                users[data.target].send(JSON.stringify({
                    type: 'signal',
                    from: data.from,
                    signal: data.signal
                }));
            }

            // Mesaj geçmişini temizleme
            if (data.type === 'clear') {
                messageHistory = [];
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'cleared' }));
                    }
                });
            }

        } catch (err) {
            console.error("Mesaj parse hatası:", err);
        }
    });

    ws.on('close', () => {
        if (userName) {
            delete users[userName];
            console.log(`${userName} ayrıldı.`);
        }
    });
});
