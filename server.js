const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let messages = [];
let voiceChannels = {}; // { kanalAdi: [kullanıcıAdı] }
let clients = new Map(); // ws -> { name, voiceChannel }

wss.on("connection", (ws) => {
    ws.on("message", (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch (err) {
            return;
        }

        if (data.type === "join") {
            clients.set(ws, { name: data.name, voiceChannel: null });
            ws.send(JSON.stringify({ type: "history", messages }));
            sendVoiceChannels();
        }

        if (data.type === "message") {
            const m = { name: data.name, text: data.text, time: Date.now() };
            messages.push(m);
            if (messages.length > 1500) messages.shift();
            broadcast(m, "message");
        }

        if (data.type === "joinVoice") {
            const client = clients.get(ws);
            if (!voiceChannels[data.channel]) voiceChannels[data.channel] = [];
            if (!voiceChannels[data.channel].includes(client.name)) {
                voiceChannels[data.channel].push(client.name);
            }
            client.voiceChannel = data.channel;
            sendVoiceChannels();
        }

        // WebRTC sinyalleşme
        if (["offer", "answer", "candidate"].includes(data.type)) {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    });

    ws.on("close", () => {
        const client = clients.get(ws);
        if (client && client.voiceChannel) {
            const arr = voiceChannels[client.voiceChannel];
            if (arr) {
                voiceChannels[client.voiceChannel] = arr.filter(n => n !== client.name);
                if (voiceChannels[client.voiceChannel].length === 0) {
                    delete voiceChannels[client.voiceChannel];
                }
            }
        }
        clients.delete(ws);
        sendVoiceChannels();
    });
});

function broadcast(obj, type) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ ...obj, type }));
        }
    });
}

function sendVoiceChannels() {
    const payload = { type: "voiceChannels", channels: voiceChannels };
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
}

server.listen(3000, () => console.log("Server çalışıyor 3000"));
