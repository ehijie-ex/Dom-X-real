const {
    EliteProTechId,
    generateRandomCode
} = require('../ids');

const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let router = express.Router();
const pino = require("pino");

const {
    default: EliteProTechConnect,
    useMultiFileAuthState,
    delay,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    downloadMediaMessage
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");
const startTime = Date.now();

const NEWSLETTER_JID = '120363413766641596@newsletter';
const NEWSLETTER_NAME = '𝐃Ω𝐌𝐆Ξ𝐍 | 𝑯บ𝑩';
const POWERED_BY = '\n\nPowered by 𝐃Ω𝐌𝐆Ξ𝐍 | 𝑯บ𝑩';

function getSessionId(id) {
    try {
        const credsPath = path.join(sessionDir, id, "creds.json");
        if (fs.existsSync(credsPath)) {
            return fs.readFileSync(credsPath).toString();
        }
    } catch (e) {
        console.error("Read session error:", e);
    }
    return null;
}

function getRuntime() {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
}

// Common Context for Newsletter Forwarding
const getContextInfo = () => ({
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: NEWSLETTER_JID,
        newsletterName: NEWSLETTER_NAME,
        serverMessageId: 143
    }
});

router.get('/getsession', async (req, res) => { /* same as before */ });

router.get('/', async (req, res) => {
    const id = EliteProTechId();
    let num = req.query.number;
    let responseSent = false;

    async function EliteProTech_PAIR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
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
                shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
                getMessage: async () => undefined,
                markOnlineOnConnect: true,
            });

            if (!EliteProTech.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await EliteProTech.requestPairingCode(num, generateRandomCode());

                if (!responseSent && !res.headersSent) {
                    res.json({ code: code, session_id: id });
                    responseSent = true;
                }
            }

            EliteProTech.ev.on('creds.update', saveCreds);

            EliteProTech.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return;
                const msg = messages[0];
                if (!msg.message) return;

                const sender = msg.key.remoteJid;
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                const cmd = text.toLowerCase().trim().split(' ')[0];

                if (msg.key.fromMe && !text.startsWith('.')) return;

                const context = getContextInfo();

                if (cmd === '.ping') {
                    await EliteProTech.sendMessage(sender, { 
                        text: '🏓 *Pong!* Bot is super fast!' + POWERED_BY,
                        contextInfo: context
                    });
                }

                else if (cmd === '.alive') {
                    await EliteProTech.sendMessage(sender, {
                        text: `🌟 *Dom-X MD Bot is Alive!*\n\n⏱️ Runtime: ${getRuntime()}\n📡 Status: Online` + POWERED_BY,
                        contextInfo: context
                    });
                }

                else if (cmd === '.menu' || cmd === '.help') {
                    const menu = `*╭───── 〔 𝐃Ω𝐌𝐆Ξ𝐍 | 𝑯บ𝑩 〕─────╮*
│
│ *👑 Main Commands*
│
├─ .ping      → Check latency
├─ .alive     → Bot status
├─ .runtime   → Show uptime
├─ .meme      → Random meme
├─ .vv        → Remove view once
├─ .hijack    → Hijack quoted message
├─ .owner     → Bot owner
├─ .session   → Get session
├─ .time      → Current time
╰───────────────────────────────╯

💡 Reply to any message with .hijack` + POWERED_BY;

                    await EliteProTech.sendMessage(sender, { 
                        text: menu,
                        contextInfo: context
                    });
                }

                else if (cmd === '.meme') {
                    try {
                        const res = await axios.get('https://meme-api.com/gimme');
                        const meme = res.data;
                        await EliteProTech.sendMessage(sender, {
                            image: { url: meme.url },
                            caption: `🤣 *${meme.title}*\n❤️ ${meme.ups} upvotes` + POWERED_BY,
                            contextInfo: context
                        });
                    } catch (e) {
                        await EliteProTech.sendMessage(sender, { 
                            text: '❌ Failed to fetch meme' + POWERED_BY,
                            contextInfo: context 
                        });
                    }
                }

                else if (cmd === '.vv') {
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quoted) {
                        return await EliteProTech.sendMessage(sender, { 
                            text: '❌ Reply to a View Once message with `.vv`' + POWERED_BY,
                            contextInfo: context 
                        });
                    }

                    try {
                        const media = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { reuploadRequest: EliteProTech.updateMediaMessage });
                        let type = quoted.videoMessage ? 'video' : 'image';
                        if (quoted.audioMessage) type = 'audio';

                        await EliteProTech.sendMessage(sender, {
                            [type]: media,
                            caption: (quoted.imageMessage?.caption || quoted.videoMessage?.caption || '') + POWERED_BY,
                            mimetype: quoted.imageMessage?.mimetype || quoted.videoMessage?.mimetype,
                            contextInfo: context
                        });
                    } catch (err) {
                        await EliteProTech.sendMessage(sender, { 
                            text: '❌ Failed to remove view once' + POWERED_BY,
                            contextInfo: context 
                        });
                    }
                }

                else if (cmd === '.hijack') {
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quoted) {
                        return await EliteProTech.sendMessage(sender, { 
                            text: '❌ Reply to a message with `.hijack`' + POWERED_BY,
                            contextInfo: context 
                        });
                    }
                    await EliteProTech.sendMessage(sender, quoted, { quoted: null });
                }

                else if (cmd === '.runtime') {
                    await EliteProTech.sendMessage(sender, { 
                        text: `⏳ *Runtime:*\n${getRuntime()}` + POWERED_BY,
                        contextInfo: context 
                    });
                }

                else if (cmd === '.owner') {
                    await EliteProTech.sendMessage(sender, { 
                        text: `👑 *Owner:* Dom\n📞 Contact: wa.me/234xxxxxxxxxx` + POWERED_BY,
                        contextInfo: context 
                    });
                }

                else if (cmd === '.time') {
                    const now = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
                    await EliteProTech.sendMessage(sender, { 
                        text: `🕒 *Time (WAT):*\n${now}` + POWERED_BY,
                        contextInfo: context 
                    });
                }

                else if (cmd === '.session') {
                    const sess = getSessionId(id);
                    if (sess) {
                        await EliteProTech.sendMessage(sender, { 
                            text: JSON.stringify(JSON.parse(sess), null, 2) + POWERED_BY,
                            contextInfo: context 
                        });
                    } else {
                        await EliteProTech.sendMessage(sender, { 
                            text: 'No session found yet' + POWERED_BY,
                            contextInfo: context 
                        });
                    }
                }
            });

            EliteProTech.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        await EliteProTech.groupAcceptInvite("JB6gGYmLOoc3o0PG3TH5CC?");
                    } catch (e) {}

                    await delay(5000);

                    const credsPath = path.join(sessionDir, id, "creds.json");
                    if (fs.existsSync(credsPath)) {
                        const sessionData = fs.readFileSync(credsPath);
                        const sessionJson = JSON.parse(sessionData.toString());

                        const Sess = await EliteProTech.sendMessage(EliteProTech.user.id, {
                            text: JSON.stringify(sessionJson)
                        });

                        const successMsg = `✅ *SESSION ID OBTAINED SUCCESSFULLY!*\n\n📁 Folder: \`${id}\`\n🔄 Auto-updating session\n\n⚠️ *Never share your session with anyone!*` + POWERED_BY;

                        await EliteProTech.sendMessage(EliteProTech.user.id, {
                            image: { url: 'https://eliteprotech-url.zone.id/1777114610844fy4lq6.jpg' },
                            caption: successMsg,
                            contextInfo: {
                                mentionedJid: [EliteProTech.user.id],
                                ...getContextInfo()
                            }
                        }, { quoted: Sess });
                    }
                } 
                else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log("Reconnecting...");
                    await delay(5000);
                    EliteProTech_PAIR_CODE();
                }
            });

        } catch (err) {
            console.error("Error:", err);
            if (!responseSent && !res.headersSent) {
                res.status(500).json({ error: "Service Unavailable" });
            }
        }
    }

    try {
        await EliteProTech_PAIR_CODE();
    } catch (e) {
        console.error(e);
    }
});

module.exports = router;
