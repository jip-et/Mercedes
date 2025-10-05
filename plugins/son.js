const { cmd } = require('../command');
const yts = require('yt-search');
const config = require('../config');

cmd({
    pattern: "song",
    alias: ["music", "mp3", "ytmusic", "audio"],
    desc: "Download music from YouTube",
    category: "media",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        let ddownr;
        try {
            ddownr = require('denethdev-ytmp3');
        } catch {
            return await reply("❌ Downloader module not available. Please install 'denethdev-ytmp3'");
        }

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
            return await reply(`❌ Please provide a YouTube URL or song title\n\nExample:\n*${config.PREFIX}song alone marshmello*\n*${config.PREFIX}song https://youtu.be/abc123*`);
        }

        const fixedQuery = convertYouTubeLink(q.trim());

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        const search = await yts(fixedQuery);
        if (!search?.videos || search.videos.length === 0) {
            return await reply('❌ No results found for your search');
        }

        const data = search.videos[0];
        if (!data) {
            return await reply('❌ No video found');
        }

        // Check if video is too long (more than 1 hour)
        const duration = data.seconds || 0;
        if (duration > 3600) {
            return await reply('❌ Video is too long (max 1 hour allowed)');
        }

        const url = data.url;
        const desc = `
*🎵 ᴍᴇʀᴄᴇᴅᴇs ᴍᴜsɪᴄ*

📌 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
📅 *Uploaded:* ${data.ago}
👁️ *Views:* ${data.views}
🔗 *Channel:* ${data.author.name}

> Downloading your audio... ⬇️
`;

        // Send song info
        await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: desc
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Download with timeout
        const downloadPromise = ddownr.download(url, 'mp3');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Download timeout')), 60000)
        );

        const result = await Promise.race([downloadPromise, timeoutPromise]);
        
        if (!result || !result.downloadUrl) {
            throw new Error("Failed to generate download URL");
        }

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        // Send audio with metadata
        await conn.sendMessage(from, {
            audio: { url: result.downloadUrl },
            mimetype: "audio/mpeg",
            fileName: `mercedes_music_${Date.now()}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("Song download error:", err);
        
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        
        let errorMsg = "❌ Download failed: ";
        if (err.message.includes('timeout')) {
            errorMsg += "Request timeout. Please try again.";
        } else if (err.message.includes('not available')) {
            errorMsg += "Video not available or restricted.";
        } else {
            errorMsg += err.message || "Unknown error occurred";
        }
        
        await reply(errorMsg);
    }
});
