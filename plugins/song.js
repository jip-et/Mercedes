const { cmd } = require('../command');
const yts = require('yt-search');
const config = require('../config');

cmd({
    pattern: "son",
    alias: ["music", "mp3", "ytmusic"],
    desc: "Download music from YouTube",
    category: "media",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        const ddownr = require('denethdev-ytmp3');

        function extractYouTubeId(url) {
            const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const match = url.match(regex);
            return match ? match[1] : null;
        }

        function convertYouTubeLink(input) {
            const videoId = extractYouTubeId(input);
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
            return input;
        }

        const q = args.join(' ');

        if (!q || q.trim() === '') {
            return await reply('*`Need YT_URL or Title`*');
        }

        const fixedQuery = convertYouTubeLink(q.trim());

        // Send searching reaction
        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        const search = await yts(fixedQuery);
        if (!search?.videos || search.videos.length === 0) {
            return await reply('*`No results found`*');
        }

        const data = search.videos[0];
        if (!data) {
            return await reply('*`No results found`*');
        }

        const url = data.url;
        const desc = `
*ᴍᴇʀᴄᴇᴅᴇs ᴍᴅ*

🎶 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
📅 *Uploaded:* ${data.ago}
👁️ *Views:* ${data.views}

> © ᴍᴇʀᴄᴇᴅᴇs ᴍᴅ 🟢
`;

        // Send song info with thumbnail
        await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: desc,
            contextInfo: {
                mentionedJid: [],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402434929024@newsletter',
                    newsletterName: "ᴍᴇʀᴄᴇᴅᴇs ᴍᴅ 🟢",
                    serverMessageId: 999
                }
            }
        }, { quoted: mek });

        // Download reaction
        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Download the audio
        const result = await ddownr.download(url, 'mp3');
        if (!result || !result.downloadUrl) {
            throw new Error("Failed to generate download URL");
        }

        const downloadLink = result.downloadUrl;

        // Upload reaction
        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        // Send the audio file
        await conn.sendMessage(from, {
            audio: { url: downloadLink },
            mimetype: "audio/mpeg",
            fileName: `${data.title.replace(/[^\w\s]/gi, '')}.mp3`,
            ptt: false
        }, { quoted: mek });

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("Song download error:", err);
        
        // Error reaction
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        
        await reply("*`Error occurred while downloading: " + (err.message || "Unknown error") + "`*");
    }
});
