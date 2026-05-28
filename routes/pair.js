const {
    EliteProTechId,
    generateRandomCode
} = require('../ids');
const express = require('express');
const fs = require('fs');
const path = require('path');
let router = express.Router();
const pino = require("pino");
const {
    default: EliteProTechConnect,
    useMultiFileAuthState,
    delay,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");
const prefix = "."; // change prefix here

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

router.get('/', async (req, res) => {
    const id = EliteProTechId();
    let num = req.query.number;
    let responseSent = false;

    async function EliteProTech_PAIR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
        console.log("Baileys version:", version);
        const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, id));
        try {
            let EliteProTech = EliteProTechConnect({
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

            if (!EliteProTech.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const randomCode = generateRandomCode();
                const code = await EliteProTech.requestPairingCode(num, randomCode);

                if (!responseSent &&!res.headersSent) {
                    res.json({ code: code, session_id: id });
                    responseSent = true;
                }
            }

            EliteProTech.ev.on('creds.update', saveCreds);

            EliteProTech.ev.on('messages.upsert', async ({ messages, type }) => {
                console.log("Event:", type, "Msg count:", messages.length);
                if (type!== 'notify') return;

                const msg = messages[0];
                if (!msg.message) return;

                const sender = msg.key.remoteJid;

                // extract text from any message type
                const msgContent = msg.message;
                const text = msgContent.conversation
                    || msgContent.extendedTextMessage?.text
                    || msgContent.imageMessage?.caption
                    || '';

                console.log("Received:", text);

                if (!text.startsWith(prefix)) return;
                if (msg.key.fromMe) return; // ignore bot's own messages

                const [rawCmd,...args] = text.slice(prefix.length).trim().split(/\s+/);
                const cmd = rawCmd.toLowerCase();

                console.log("Command:", cmd, "Args:", args);

                try {
                    await delay(500); // avoid rate limit

                    if (cmd === 'ping') {
                        await EliteProTech.sendMessage(sender, { text: 'pong ✅', quoted: msg });
                    }

                    if (cmd === 'alive') {
                        await EliteProTech.sendMessage(sender, {
                            text: 'Dom-X MD Bot is alive and running 🔥',
                            quoted: msg
                        });
                    }

                    if (cmd === 'menu') {
                        await EliteProTech.sendMessage(sender, {
                            text: `*Dom-X MD Bot Menu*\n\n${prefix}ping → test bot response\n${prefix}alive → check if bot is running\n${prefix}session → get current session ID\n${prefix}menu → show this menu`,
                            quoted: msg
                        });
                    }

                    if (cmd === 'session') {
                        const sess = getSessionId(id);
                        await EliteProTech.sendMessage(sender, {
                            text: sess? JSON.stringify(JSON.parse(sess)) : 'No session found yet',
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
                    try {
                        await EliteProTech.groupAcceptInvite("JB6gGYmLOoc3o0PG3TH5CC?");
                    } catch (error) {
                        console.error("Newsletter/group error:", error);
                    }

                    await delay(5000);
                    let sessionData = null;
                    let attempts = 0;
                    const maxAttempts = 15;

                    while (attempts < maxAttempts &&!sessionData) {
                        try {
                            const credsPath = path.join(sessionDir, id, "creds.json");
                            if (fs.existsSync(credsPath)) {
                                const data = fs.readFileSync(credsPath);
                                if (data && data.length > 100) {
                                    sessionData = data;
                                    break;
                                }
                            }
                            await delay(8000);
                            attempts++;
                        } catch (readError) {
                            console.error("Read error:", readError);
                            await delay(2000);
                            attempts++;
                        }
                    }

                    if (!sessionData) return;

                    try {
                        let sessionSent = false;
                        let sendAttempts = 0;
                        const maxSendAttempts = 5;
                        let Sess = null;

                        while (sendAttempts < maxSendAttempts &&!sessionSent) {
                            try {
                                const sessionJson = JSON.parse(sessionData.toString());
                                const formatted = JSON.stringify(sessionJson);

                                Sess = await EliteProTech.sendMessage(EliteProTech.user.id, {
                                    text: formatted
                                });
                                sessionSent = true;
                            } catch (sendError) {
                                console.error("Send error:", sendError);
                                sendAttempts++;
                                if (sendAttempts < maxSendAttempts) await delay(3000);
                            }
                        }

                        if (!sessionSent) return;

                        await delay(3000);

                        let EliteProTech_TEXT = `✅ *SESSION ID OBTAINED SUCCESSFULLY!*
📁 Session folder: \`${id}\`
📁 creds.json is saved in \`session/${id}/\` and auto-updates

Commands:
${prefix}menu → show all commands
${prefix}ping → test bot response
${prefix}alive → check bot status
${prefix}session → get current session ID

🚫 *Do NOT share your session ID or creds.json with anyone.*`;

                        try {
                            const EliteProTechMess = {
                                image: { url: 'https://eliteprotech-url.zone.id/1777114610844fy4lq6.jpg' },
                                caption: EliteProTech_TEXT,
                                contextInfo: {
                                    mentionedJid: [EliteProTech.user.id],
                                    forwardingScore: 5,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: '120363413766641596@newsletter',
                                        newsletterName: "Dom-X MD Bot",
                                        serverMessageId: 143
                                    }
                                }
                            };
                            await EliteProTech.sendMessage(EliteProTech.user.id, EliteProTechMess, { quoted: Sess });
                        } catch (messageError) {
                            console.error("Message send error:", messageError);
                        }

                    } catch (sessionError) {
                        console.error("Session processing error:", sessionError);
                    }

                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode!= 401) {
                    console.log("Reconnecting...");
                    await delay(5000);
                    EliteProTech_PAIR_CODE();
                }
            });

        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent &&!res.headersSent) {
                res.status(500).json({ code: "Service is Currently Unavailable" });
                responseSent = true;
            }
        }
    }

    try {
        await EliteProTech_PAIR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        if (!responseSent &&!res.headersSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;
