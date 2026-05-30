const {
    EliteProTechId,
    generateRandomCode
} = require('../ids');

const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const acrcloud = require('acrcloud');

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

// ==================== OWNERS ====================
const OWNERS = [
    '2347064554028@s.whatsapp.net',
    '91702366879842@lid',
    '34665083711673@lid',
    '2348169415320@s.whatsapp.net'
];

let isPublic = true; // Default: Public mode (responds to everyone)

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
                shouldIgnoreJid: () => false,
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
                let text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                text = text.trim();

                if (!text) return;

                let command = text.toLowerCase().split(' ')[0];
                if (command.startsWith('.')) {
                    command = command.slice(1);
                }
                const args = text.split(' ').slice(1);

                const isOwner = OWNERS.includes(sender);

                // Mode Check
                if (!isOwner && !isPublic && !['menu', 'help', 'owner'].includes(command)) {
                    return; // In private mode, only owner can use commands (except menu/help/owner)
                }

                if (msg.key.fromMe && !['ping','alive','menu','help','meme','vv','ytdl','ytmp3','ytaudio','ai-search','ais','searchai','ai','ask','shazam','whatmusic','quemusica','tagall','hidetag','promote','demote','runtime','owner','time','public','private'].includes(command)) return;

                const context = getContextInfo();

                const isGroupCmd = ['tagall', 'hidetag', 'promote', 'demote'].includes(command);
                if (isGroupCmd && !isGroup) {
                    return await EliteProTech.sendMessage(sender, { 
                        text: '❌ This command can only be used in groups!' + POWERED_BY,
                        contextInfo: context 
                    });
                }

                if (command === 'ping') {
                    await EliteProTech.sendMessage(sender, { 
                        text: '🏓 *Pong!* Bot is super fast!' + POWERED_BY, 
                        contextInfo: context 
                    });
                }

                else if (command === 'alive') {
                    await EliteProTech.sendMessage(sender, {
                        text: `🌟 *Dom-X MD Bot is Alive!*\n\n⏱️ Runtime: ${getRuntime()}\n📡 Status: Online` + POWERED_BY,
                        contextInfo: context
                    });
                }

                else if (command === 'menu' || command === 'help') {
                    const menu = `*╭───── 〔 𝐃Ω𝐌𝐆Ξ𝐍 | 𝑯บ𝑩 〕─────╮*
│
│ *👑 Main Commands (No Prefix)*
│
├─ ping        → Check latency
├─ alive       → Bot status
├─ runtime     → Show uptime
├─ meme        → Random meme
├─ vv          → Remove view once
├─ ytdl        → YouTube audio
├─ ai-search   → AI Search
├─ ai / ask    → Advanced AI
├─ shazam      → Identify music
├─ tagall      → Tag all members
├─ hidetag     → Hidden tag
├─ promote     → Promote member
├─ demote      → Demote member
├─ owner       → Bot owner
├─ time        → Current time
├─ public      → Public mode
├─ private     → Private mode
╰───────────────────────────────╯

💡 Just type the command without dot` + POWERED_BY;

                    await EliteProTech.sendMessage(sender, { 
                        text: menu, 
                        contextInfo: context 
                    });
                }

                // ==================== PUBLIC / PRIVATE MODE ====================
                else if (command === 'public') {
                    if (!isOwner) return await EliteProTech.sendMessage(sender, { text: '❌ Only owner can use this!' + POWERED_BY, contextInfo: context });
                    isPublic = true;
                    await EliteProTech.sendMessage(sender, { text: '✅ Bot is now in **Public Mode** (Everyone can use commands)' + POWERED_BY, contextInfo: context });
                }

                else if (command === 'private') {
                    if (!isOwner) return await EliteProTech.sendMessage(sender, { text: '❌ Only owner can use this!' + POWERED_BY, contextInfo: context });
                    isPublic = false;
                    await EliteProTech.sendMessage(sender, { text: '✅ Bot is now in **Private Mode** (Only owner can use commands)' + POWERED_BY, contextInfo: context });
                }

                else if (command === 'meme') {
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

                else if (command === 'vv') {
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quoted) {
                        return await EliteProTech.sendMessage(sender, { 
                            text: '❌ Reply to a View Once message with `vv`' + POWERED_BY,
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

                // ==================== SHAZAM COMMAND ====================
                else if (['shazam', 'whatmusic', 'quemusica'].includes(command)) {
                    try {
                        const acr = new acrcloud({
                            host: 'identify-eu-west-1.acrcloud.com',
                            access_key: 'c33c767d683f78bd17d4bd4991955d81',
                            access_secret: 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu'
                        });

                        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || msg.message;
                        const mime = quoted.audioMessage?.mimetype || quoted.videoMessage?.mimetype || '';

                        if (!/audio|video/.test(mime)) {
                            return await EliteProTech.sendMessage(sender, { 
                                text: '❌ Please reply to an audio or video message!' + POWERED_BY,
                                contextInfo: context 
                            });
                        }

                        await EliteProTech.sendMessage(sender, { 
                            text: '🔍 Identifying music...', 
                            contextInfo: context 
                        });

                        const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { reuploadRequest: EliteProTech.updateMediaMessage });
                        const ext = mime.split('/')[1] || 'mp3';
                        const filePath = `./tmp/\( {Date.now()}. \){ext}`;

                        if (!fs.existsSync('./tmp')) {
                            fs.mkdirSync('./tmp', { recursive: true });
                        }

                        fs.writeFileSync(filePath, buffer);

                        const res = await acr.identify(fs.readFileSync(filePath));
                        const { code, msg: errorMsg } = res.status;

                        if (code !== 0) {
                            fs.unlinkSync(filePath);
                            throw new Error(errorMsg);
                        }

                        const { title, artists, album, genres, release_date } = res.metadata.music[0];

                        const txt = `
*🎵 Music Identified!*

• *TITLE:* ${title || 'Not found'}
• *ARTIST:* ${artists ? artists.map(v => v.name).join(', ') : 'Not found'}
• *ALBUM:* ${album?.name || 'Not found'}
• *GENRE:* ${genres ? genres.map(v => v.name).join(', ') : 'Not found'}
• *RELEASE DATE:* ${release_date || 'Not found'}
                        `.trim();

                        fs.unlinkSync(filePath);

                        await EliteProTech.sendMessage(sender, { 
                            text: txt + POWERED_BY,
                            contextInfo: context 
                        });

                    } catch (err) {
                        console.error('Shazam Error:', err);
                        await EliteProTech.sendMessage(sender, { 
                            text: '❌ Failed to identify music: ' + err.message + POWERED_BY,
                            contextInfo: context 
                        });
                    }
                }

                // ... (rest of your commands: ytdl, ai-search, ai, tagall, etc. remain the same)

                else if (['ytdl', 'ytmp3', 'ytaudio'].includes(command)) {
                    // Your existing YouTube code here (unchanged)
                }

                else if (['ai-search', 'ais', 'searchai'].includes(command)) {
                    // Your existing ai-search code here (unchanged)
                }

                else if (command === 'ai' || command === 'ask') {
                    // Your preferred AI code here (unchanged from last version)
                }

                else if (command === 'tagall') {
                    if (!isOwner) return await EliteProTech.sendMessage(sender, { text: '❌ Only owner can use this command' + POWERED_BY, contextInfo: context });
                    const metadata = await EliteProTech.groupMetadata(sender);
                    let teks = `👥 *TAG ALL* (${metadata.participants.length} members)\n\n`;
                    let mentions = metadata.participants.map(p => p.id);
                    await EliteProTech.sendMessage(sender, { text: teks, mentions });
                }

                // ... (hidetag, promote, demote, runtime, owner, time - unchanged)

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
