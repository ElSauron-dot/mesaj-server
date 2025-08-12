const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`Server listening on port ${port}`);

let messageHistory = [];
let users = {}; // { username: ws }
let voiceChannels = {
    "Genel": []
};

function broadcast(obj) {
    const str = JSON.stringify(obj);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(str);
        }
    });
}

wss.on('connection', (ws) => {
    let userName = null;

    // Mevcut verileri gönder
    ws.send(JSON.stringify({ type: 'history', messages: messageHistory }));
    ws.send(JSON.stringify({ type: 'voiceChannels', channels: voiceChannels }));

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'join') {
                userName = data.name;
                users[userName] = ws;
                console.log(`${userName} bağlandı`);
                return;
            }

            if (data.type === 'message') {
                const msgObj = { name: data.name, text: data.text, time: Date.now() };
                messageHistory.push(msgObj);
                if (messageHistory.length > 1500) messageHistory.shift();
                broadcast({ type: 'message', ...msgObj });
            }

            if (data.type === 'joinVoice') {
                const channel = data.channel;
                Object.keys(voiceChannels).forEach(ch => {
                    voiceChannels[ch] = voiceChannels[ch].filter(u => u !== userName);
                });
                voiceChannels[channel].push(userName);
                broadcast({ type: 'voiceChannels', channels: voiceChannels });
            }

            if (data.type === 'leaveVoice') {
                Object.keys(voiceChannels).forEach(ch => {
                    voiceChannels[ch] = voiceChannels[ch].filter(u => u !== userName);
                });
                broadcast({ type: 'voiceChannels', channels: voiceChannels });
            }

            // WebRTC sinyalleşme
            if (["offer", "answer", "ice"].includes(data.type)) {
                if (data.target && users[data.target]) {
                    users[data.target].send(JSON.stringify({
                        type: data.type,
                        from: userName,
                        sdp: data.sdp,
                        candidate: data.candidate
                    }));
                }
            }

        } catch (err) {
            console.error("Mesaj hatası:", err);
        }
    });

    ws.on('close', () => {
        if (userName) {
            delete users[userName];
            Object.keys(voiceChannels).forEach(ch => {
                voiceChannels[ch] = voiceChannels[ch].filter(u => u !== userName);
            });
            broadcast({ type: 'voiceChannels', channels: voiceChannels });
            console.log(`${userName} ayrıldı`);
        }
    });
});
