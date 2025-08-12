const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server running on port ${port}`);

let messageHistory = [];
let voiceChannels = ["Genel Sesli Kanal"];

wss.on('connection', (ws) => {
    // Bağlanınca mevcut verileri gönder
    ws.send(JSON.stringify({ type: 'history', messages: messageHistory }));
    ws.send(JSON.stringify({ type: 'voiceChannels', channels: voiceChannels }));

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'message') {
                const newMsg = { name: data.name, text: data.text, time: Date.now() };
                messageHistory.push(newMsg);
                if (messageHistory.length > 1500) messageHistory.shift();
                broadcast({ type: 'message', ...newMsg });
            }

            if (data.type === 'addVoiceChannel') {
                if (!voiceChannels.includes(data.channel)) {
                    voiceChannels.push(data.channel);
                    broadcast({ type: 'voiceChannels', channels: voiceChannels });
                }
            }
        } catch (e) {
            console.error("JSON parse error:", e);
        }
    });
});

function broadcast(obj) {
    const str = JSON.stringify(obj);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(str);
        }
    });
}
