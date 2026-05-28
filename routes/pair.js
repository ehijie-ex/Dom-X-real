                const {
    EliteProTechId,
    removeFile, // you can delete this import now if unused
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

// NEW: helper to read current session id
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

// NEW: endpoint to fetch session id later without deleting anything
router.get('/getsession', async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const sess = getSessionId(id);
    if (!sess) return res.status(404).json({ error: "session not found" });
    res.json({ session_id: JSON.parse(sess) }); // send as object so you can stringify if needed
});

router.get('/', async (req, res) => {
    const id = EliteProTechId();
    let num = req.query.number;
    let responseSent = false;
    
    // REMOVED: cleanUpSession function entirely - we keep the session now
    
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
                shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
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
                
                if (!responseSent && !res.headersSent) {
                    res.json({ code: code, session_id: id }); // also return session folder name
                    responseSent = true;
                }
            }
            
            // This keeps saving creds.json whenever Baileys rotates keys
            EliteProTech.ev.on('creds.update', saveCreds);
            
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
                    
                    while (attempts < maxAttempts && !sessionData) {
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
                    
                    if (!sessionData) return; // just exit, don't delete
                    
                    try {
                        let sessionSent = false;
                        let sendAttempts = 0;
                        const maxSendAttempts = 5;
                        let Sess = null;

                        while (sendAttempts < maxSendAttempts && !sessionSent) {
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
                        
                        if (!sessionSent) return; // don't delete on fail
                        
                        await delay(3000);
                        
                        let EliteProTech_TEXT = `✅ *SESSION ID OBTAINED SUCCESSFULLY!*  
📁 Session folder: \`${id}\`  
📁 creds.json is saved in \`session/${id}/\` and will auto-update

📢 *Stay Updated — Follow Our Channels:*
➊ *WhatsApp Channel*  
https://whatsapp.com/channel/0029Vb8wyGk1iUxdoi0WOA1U
➋ *Telegram*  
https://t.me/Domxchannel
➌ *YouTube*  
https://YouTube.com/@Dom-x-t5v

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
                        
                        // REMOVED: close + delete. Connection stays alive and creds.update keeps saving new session data
                        
                    } catch (sessionError) {
                        console.error("Session processing error:", sessionError);
                    }
                    
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    console.log("Reconnecting...");
                    await delay(5000);
                    EliteProTech_PAIR_CODE();
                }
            });
            
        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent && !res.headersSent) {
                res.status(500).json({ code: "Service is Currently Unavailable" });
                responseSent = true;
            }
            // REMOVED: cleanUpSession
        }
    }
    
    try {
        await EliteProTech_PAIR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        if (!responseSent && !res.headersSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;        
                        
