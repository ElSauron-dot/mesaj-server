const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let messages = [];
let voiceChannels = {}; // { channelName: [username, ...] }
let clients = new Map(); // ws -> username

wss.on("connection", (ws) => {
    console.log("Yeni bağlantı");

    ws.on("message", (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch {
            return;
        }

        if (data.type === "join") {
            clients.set(ws, data.name);
            ws.send(JSON.stringify({ type: "history", messages }));
            updateVoiceChannels();
        }

        if (data.type === "message") {
            const m = { name: data.name, text: data.text, time: Date.now() };
            messages.push(m);
            if (messages.length > 1500) messages.shift();
            broadcast(m, "message");
        }

        if (data.type === "joinVoice") {
            // Kanala ekle
            if (!voiceChannels[data.channel]) voiceChannels[data.channel] = [];
            if (!voiceChannels[data.channel].includes(data.name)) {
                voiceChannels[data.channel].push(data.name);
            }
            updateVoiceChannels();
        }

        if (data.type === "leaveVoice") {
            if (voiceChannels[data.channel]) {
                voiceChannels[data.channel] = voiceChannels[data.channel].filter(u => u !== data.name);
                if (voiceChannels[data.channel].length === 0) {
                    delete voiceChannels[data.channel];
                }
            }
            updateVoiceChannels();
        }

        if (["offer", "answer", "candidate"].includes(data.type)) {
            // WebRTC sinyalleme
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    });

    ws.on("close", () => {
        const username = clients.get(ws);
        clients.delete(ws);
        for (let ch in voiceChannels) {
            voiceChannels[ch] = voiceChannels[ch].filter((u) => u !== username);
            if (voiceChannels[ch].length === 0) delete voiceChannels[ch];
        }
        updateVoiceChannels();
    });
});

function broadcast(data, type) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, ...data }));
        }
    });
}

function updateVoiceChannels() {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "voiceChannels", channels: voiceChannels }));
        }
    });
}

server.listen(3000, () => console.log("Server 3000 portunda çalışıyor"));
