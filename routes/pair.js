const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require("pino");
const {
    default: EliteProTechConnect,
    useMultiFileAuthState,
    delay,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const { EliteProTechId, generateRandomCode } = require('../ids');

const router = express.Router();
const sessionDir = path.join(__dirname, "..", "session");
const prefix = ".";

let EliteProTech; // global socket
const botId = EliteProTechId();

function getSessionId(id) {
    try {
        const credsPath = path.join(sessionDir, id, "creds.json");
        if (fs.existsSync(credsPath)) {
            const data = fs.readFileSync(credsPath);
            return data.toString();
        }
    } catch (e) {
        console.error("Read session error:", e);
    }
    return null;
}

router.get('/getsession', async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const sess = getSessionId(id);
    if (!sess) return res.status(404).json({ error: "session not found" });
    res.json({ session_id: JSON.parse(sess) });
});

// Keep your pairing route if you still want it
router.get('/code', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "number required" });
    if (!EliteProTech || !EliteProTech.authState.creds.registered) {
        return res.status(503).json({ error: "Bot not connected yet" });
    }
    num = num.replace(/[^0-9]/g, '');
    const code = await EliteProTech.requestPairingCode(num, generateRandomCode());
    res.json({ code, session_id: botId });
});

async function EliteProTech_PAIR_CODE() {
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    
    const { version } = await fetchLatestBaileysVersion();
    console.log("Baileys version:", version);
    const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, botId));
    
    EliteProTech = EliteProTechConnect({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "info" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "info" }),
        browser: Browsers.macOS("Safari"),
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        getMessage: async () => undefined,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
    });

    EliteProTech.ev.on('creds.update', saveCreds);

    EliteProTech.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation
            || msg.message.extendedTextMessage?.text
            || msg.message.imageMessage?.caption
            || '';

        console.log("Received:", text);
        if (!text.startsWith(prefix)) return;
        if (msg.key.fromMe) return;

        const [rawCmd, ...args] = text.slice(prefix.length).trim().split(/\s+/);
        const cmd = rawCmd.toLowerCase();
        console.log("Command:", cmd, "Args:", args);

        try {
            await delay(500);
            if (cmd === 'ping') {
                await EliteProTech.sendMessage(sender, { text: 'pong ✅', quoted: msg });
            }
            if (cmd === 'alive') {
                await EliteProTech.sendMessage(sender, { text: 'Dom-X MD Bot is alive and running 🔥', quoted: msg });
            }
            if (cmd === 'menu') {
                await EliteProTech.sendMessage(sender, {
                    text: `*Dom-X MD Bot Menu*\n\n${prefix}ping → test bot response\n${prefix}alive → check if bot is running\n${prefix}session → get current session ID\n${prefix}menu → show this menu`,
                    quoted: msg
                });
            }
            if (cmd === 'session') {
                const sess = getSessionId(botId);
                await EliteProTech.sendMessage(sender, {
                    text: sess ? JSON.stringify(JSON.parse(sess)) : 'No session found yet',
                    quoted: msg
                });
            }
        } catch (err) {
            console.error("Command error:", err);
        }
    });

    EliteProTech.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        console.log("Connection:", connection);

        if (connection === "open") {
            console.log("Bot connected as:", EliteProTech.user.id);
        } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
            console.log("Reconnecting...");
            await delay(5000);
            EliteProTech_PAIR_CODE();
        }
    });
}

// Export this so index.js can call it on boot
module.exports.startBot = EliteProTech_PAIR_CODE;
module.exports.qrRoute = router; // rename if you had qrRoute
module.exports.pairRoute = router;
