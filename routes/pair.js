const {
    EliteProTechId,
    generateRandomCode
} = require('../ids');

const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');

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
const OWNER_NUMBER = '2347064554028';

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

const getContextInfo = () => ({
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: NEWSLETTER_JID,
        newsletterName: NEWSLETTER_NAME,
        serverMessageId: 143
    }
});

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
                shouldIgnoreJid: () => false,           // ✅ Allow groups
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
                const isGroup = sender.endsWith('@g.us');
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                const cmd = text.toLowerCase().trim().split(' ')[0];
                const args = text.trim().split(' ').slice(1);

                if (msg.key.fromMe && !text.startsWith('.')) return;

                const context = getContextInfo();

                // Group-only check
                const isGroupCmd = ['.tagall', '.hidetag', '.promote', '.demote'].includes(cmd);
                if (isGroupCmd && !isGroup) {
                    return await EliteProTech.sendMessage(sender, { 
                        text: '❌ This command can only be used in groups!' + POWERED_BY,
                        contextInfo: context 
                    });
                }

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
├─ .ytdl      → YouTube audio downloader
├─ .tagall    → Tag all members
├─ .hidetag   → Hidden tag
├─ .promote   → Promote member
├─ .demote    → Demote member
├─ .owner     → Bot owner
├─ .time      → Current time
╰───────────────────────────────╯

💡 Usage: .ytdl <link or search>` + POWERED_BY;

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

                else if (cmd === '.ytdl' || cmd === '.ytmp3' || cmd === '.ytaudio') {
                    // (Your existing .ytdl code - unchanged)
                    if (!args[0]) {
                        return await EliteProTech.sendMessage(sender, { 
                            text: "Usage:\n`.ytdl <youtube link>`\n`.ytdl <search query>`" + POWERED_BY,
                            contextInfo: context 
                        });
                    }

                    await EliteProTech.sendMessage(sender, { 
                        text: "⭐ Please wait... Processing request." + POWERED_BY,
                        contextInfo: context 
                    });

                    try {
                        let input = args.join(" ").trim();
                        let finalUrl = input;

                        if (!input.includes("youtube.com") && !input.includes("youtu.be")) {
                            const results = await yts(input);
                            if (!results.videos.length) {
                                return await EliteProTech.sendMessage(sender, { 
                                    text: "No results found on YouTube." + POWERED_BY,
                                    contextInfo: context 
                                });
                            }
                            finalUrl = results.videos[0].url;
                        }

                        const apiUrl = `https://api-abztech.zone.id/download/ytdlv3?url=${encodeURIComponent(finalUrl)}`;
                        const apiRes = await axios.get(apiUrl);
                        const data = apiRes.data;

                        if (!data.status) {
                            return await EliteProTech.sendMessage(sender, { 
                                text: `API Error: ${data.message || "Unknown error"}` + POWERED_BY,
                                contextInfo: context 
                            });
                        }

                        const { downloadUrl, filename, title, thumbnail } = data;
                        const audioRes = await axios.get(downloadUrl, { responseType: "arraybuffer" });
                        const buffer = Buffer.from(audioRes.data);

                        await EliteProTech.sendMessage(sender, {
                            audio: buffer,
                            mimetype: "audio/mpeg",
                            fileName: filename || `${title}.mp3`,
                            ptt: false,
                            contextInfo: {
                                ...context,
                                externalAdReply: {
                                    title: title || filename,
                                    body: "Powered by 𝐃Ω𝐌𝐆Ξ𝐍 | 𝑯บ𝑩",
                                    thumbnailUrl: thumbnail,
                                    mediaType: 1,
                                    mediaUrl: finalUrl,
                                    sourceUrl: finalUrl,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: false
                                }
                            }
                        });
                    } catch (err) {
                        console.error('YTDL error:', err.message);
                        await EliteProTech.sendMessage(sender, { 
                            text: '❌ Failed to process request.' + POWERED_BY,
                            contextInfo: context 
                        });
                    }
                }

                // ==================== NEW GROUP COMMANDS ====================
                else if (cmd === '.tagall') {
                    const metadata = await EliteProTech.groupMetadata(sender);
                    let teks = `👥 *TAG ALL* (${metadata.participants.length} members)\n\n`;
                    let mentions = [];

                    for (let participant of metadata.participants) {
                        teks += `@${participant.id.split('@')[0]}\n`;
                        mentions.push(participant.id);
                    }

                    await EliteProTech.sendMessage(sender, { 
                        text: teks, 
                        mentions 
                    });
                }

                else if (cmd === '.hidetag') {
                    const metadata = await EliteProTech.groupMetadata(sender);
                    let mentions = metadata.participants.map(p => p.id);
                    const messageText = args.join(" ") || "Hidden tag message from admin";

                    await EliteProTech.sendMessage(sender, { 
                        text: messageText, 
                        mentions 
                    });
                }

                else if (cmd === '.promote') {
                    const user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                                (msg.message.extendedTextMessage?.contextInfo?.quotedMessage ? 
                                 msg.message.extendedTextMessage.contextInfo.participant : null);

                    if (!user) {
                        return await EliteProTech.sendMessage(sender, { 
                            text: '❌ Reply or mention the user to promote' + POWERED_BY,
                            contextInfo: context 
                        });
                    }

                    await EliteProTech.groupParticipantsUpdate(sender, [user], "promote");
                    await EliteProTech.sendMessage(sender, { 
                        text: `✅ Promoted @${user.split('@')[0]}` + POWERED_BY,
                        mentions: [user],
                        contextInfo: context 
                    });
                }

                else if (cmd === '.demote') {
                    const user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                                (msg.message.extendedTextMessage?.contextInfo?.quotedMessage ? 
                                 msg.message.extendedTextMessage.contextInfo.participant : null);

                    if (!user) {
                        return await EliteProTech.sendMessage(sender, { 
                            text: '❌ Reply or mention the user to demote' + POWERED_BY,
                            contextInfo: context 
                        });
                    }

                    await EliteProTech.groupParticipantsUpdate(sender, [user], "demote");
                    await EliteProTech.sendMessage(sender, { 
                        text: `✅ Demoted @${user.split('@')[0]}` + POWERED_BY,
                        mentions: [user],
                        contextInfo: context 
                    });
                }

                else if (cmd === '.runtime') {
                    await EliteProTech.sendMessage(sender, { 
                        text: `⏳ *Runtime:*\n${getRuntime()}` + POWERED_BY,
                        contextInfo: context 
                    });
                }

                else if (cmd === '.owner') {
                    await EliteProTech.sendMessage(sender, { 
                        text: `👑 *Owner:* Dom\n📞 Contact: wa.me/${OWNER_NUMBER}` + POWERED_BY,
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

                        const Sess = await EliteProTech.sendMessage(EliteProTech.user.id, { text: JSON.stringify(sessionJson) });

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
