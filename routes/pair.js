const {
    EliteProTechId,
    generateRandomCode
} = require('../ids');
const express = require('express');
const fs = require('fs');
const path = require('path');
let router = express.Router();
const pino = require("pino");
const axios = require('axios');
const yts = require('yt-search');
const {
    default: EliteProTechConnect,
    useMultiFileAuthState,
    delay,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");

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
        console.log(version);
        const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, id));
        try {
            let EliteProTech = EliteProTechConnect({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
                syncFullHistory: false,
                generateHighQualityLinkPreview: true,
                shouldIgnoreJid: jid =>!!jid?.endsWith('@g.us'),
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

            // WhatsApp bot commands
            EliteProTech.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type!== 'notify') return;
                const msg = messages[0];
                if (!msg.message) return;

                const sender = msg.key.remoteJid;
                const text = msg.message.conversation
                    || msg.message.extendedTextMessage?.text
                    || '';
                const cmd = text.toLowerCase().trim();
                const args = text.split(' ').slice(1);

                if (msg.key.fromMe &&!cmd.startsWith('.')) return;

                if (cmd === '.ping') {
                    await EliteProTech.sendMessage(sender, { text: 'pong ✅' });
                }

                if (cmd === '.alive') {
                    await EliteProTech.sendMessage(sender, {
                        text: 'Dom-X MD Bot is alive and running 🔥'
                    });
                }

                if (cmd === '.menu') {
                    await EliteProTech.sendMessage(sender, {
                        text: `*Dom-X MD Bot Menu*

.ping → test bot response
.alive → check if bot is running
.ytdl <link|search> → download YouTube audio
.session → get current session ID
.menu → show this menu`
                    });
                }

                if (cmd === '.session') {
                    const sess = getSessionId(id);
                    if (sess) {
                        await EliteProTech.sendMessage(sender, {
                            text: JSON.stringify(JSON.parse(sess))
                        });
                    } else {
                        await EliteProTech.sendMessage(sender, {
                            text: 'No session found yet'
                        });
                    }
                }

                // YTDL command
                if (cmd.startsWith('.ytdl') || cmd.startsWith('.ytmp3') || cmd.startsWith('.ytaudio') || cmd.startsWith('.song')) {
                    try {
                        if (!args[0]) {
                            return await EliteProTech.sendMessage(sender, {
                                text: "Usage:\n.ytdl <youtube link>\n.ytdl <search query>",
                                quoted: msg
                            });
                        }

                        await EliteProTech.sendMessage(sender, {
                            text: "⭐𝘗𝘭𝘦𝘢𝘴𝘦 𝘸𝘢𝘪𝘵... 𝘗𝘳𝘰𝘤𝘦𝘴𝘪𝘯𝘨 𝘳𝘦𝘲𝘶𝘦𝘴𝘵.",
                            quoted: msg
                        });

                        let input = args.join(" ").trim();
                        let finalUrl = input;

                        if (!input.includes("youtube.com") &&!input.includes("youtu.be")) {
                            const results = await yts(input);
                            if (!results ||!results.videos || results.videos.length === 0) {
                                return await EliteProTech.sendMessage(sender, {
                                    text: "No results found on YouTube.",
                                    quoted: msg
                                });
                            }
                            finalUrl = results.videos[0].url;
                        }

                        const apiUrl = `https://api-abztech.zone.id/download/ytdlv3?url=${encodeURIComponent(finalUrl)}`;
                        const apiRes = await axios.get(apiUrl);
                        const data = apiRes.data;

                        if (!data ||!data.status) {
                            return await EliteProTech.sendMessage(sender, {
                                text: `API Error: ${data?.message || "Unknown error"}`,
                                quoted: msg
                            });
                        }

                        const { downloadUrl, filename } = data;
                        const audioRes = await axios.get(downloadUrl, {
                            responseType: "arraybuffer"
                        });
                        const buffer = Buffer.from(audioRes.data);

                        await EliteProTech.sendMessage(sender, {
                            audio: buffer,
                            mimetype: "audio/mpeg",
                            fileName: filename,
                            ptt: false
                        }, { quoted: msg });

                    } catch (err) {
                        console.error('YTDL error:', err.response?.data || err.message);
                        await EliteProTech.sendMessage(sender, {
                            text: 'Failed to process request.',
                            quoted: msg
                        });
                    }
                }
            });

            EliteProTech.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

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
.menu → show all commands
.ping → test bot response
.alive → check bot status
.ytdl <link|search> → download YouTube audio
.session → get current session ID

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
