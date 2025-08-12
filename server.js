const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

let messageHistory = [];
let voiceChannels = [{ name: "Genel Sesli Kanal", members: [] }];

function broadcast(obj, exclude = null) {
    const str = JSON.stringify(obj);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== exclude) {
            client.send(str);
        }
    });
}

wss.on('connection', (ws) => {
    ws.id = Math.random().toString(36).substr(2, 9);

    // Mesaj geçmişini ve kanalları gönder
    ws.send(JSON.stringify({ type: 'history', messages: messageHistory }));
    ws.send(JSON.stringify({ type: 'voiceChannels', channels: voiceChannels.map(c => c.name) }));

    ws.on('message', (msg) => {
        let data;
        try { data = JSON.parse(msg); } catch { return; }

        // Mesajlaşma
        if (data.type === 'message') {
            const newMsg = { name: data.name, text: data.text, time: Date.now() };
            messageHistory.push(newMsg);
            if (messageHistory.length > 1500) messageHistory.shift();
            broadcast({ type: 'message', ...newMsg });
        }

        // Yeni ses kanalı
        if (data.type === 'addVoiceChannel') {
            if (!voiceChannels.find(c => c.name === data.channel)) {
                voiceChannels.push({ name: data.channel, members: [] });
                broadcast({ type: 'voiceChannels', channels: voiceChannels.map(c => c.name) });
            }
        }

        // Sesli arama sinyalleşmesi
        if (["offer", "answer", "candidate"].includes(data.type)) {
            broadcast(data, ws); // herkese gönder
        }
    });

    ws.on('close', () => {
        voiceChannels.forEach(c => {
            c.members = c.members.filter(m => m !== ws.id);
        });
    });
});

console.log(`Server running on port ${port}`);
