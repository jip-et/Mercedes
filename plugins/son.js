const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

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
        const q = args.join(' ');

        if (!q || q.trim() === '') {
            return await reply(`❌ Please provide a YouTube URL or song title\n\nExample:\n*${config.PREFIX}song alone marshmello*\n*${config.PREFIX}song https://youtu.be/abc123*`);
        }

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        let videoUrl = q;
        
        // If it's not a URL, search for the video
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            const search = await yts(q);
            if (!search?.videos || search.videos.length === 0) {
                return await reply('❌ No results found for your search');
            }
            videoUrl = search.videos[0].url;
        }

        // Validate YouTube URL
        if (!ytdl.validateURL(videoUrl)) {
            return await reply('❌ Invalid YouTube URL');
        }

        const info = await ytdl.getInfo(videoUrl);
        const videoDetails = info.videoDetails;

        // Check duration (max 30 minutes)
        const duration = parseInt(videoDetails.lengthSeconds);
        if (duration > 1800) {
            return await reply('❌ Video is too long (max 30 minutes allowed)');
        }

        const desc = `
*🎵 ᴍᴇʀᴄᴇᴅᴇs ᴍᴜsɪᴄ*

📌 *Title:* ${videoDetails.title}
⏱️ *Duration:* ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}
👁️ *Views:* ${parseInt(videoDetails.viewCount).toLocaleString()}
🔗 *Channel:* ${videoDetails.author.name}

> Downloading your audio... ⬇️
`;

        // Send song info
        await conn.sendMessage(from, {
            image: { url: videoDetails.thumbnails[0].url },
            caption: desc
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Create temp file path
        const tempPath = `./temp/audio_${Date.now()}.mp3`;

        // Download audio
        const audioStream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });

        // Write to file
        const writeStream = fs.createWriteStream(tempPath);
        audioStream.pipe(writeStream);

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        // Send audio file
        await conn.sendMessage(from, {
            audio: fs.readFileSync(tempPath),
            mimetype: 'audio/mpeg',
            fileName: `mercedes_music_${Date.now()}.mp3`,
            ptt: false
        }, { quoted: mek });

        // Clean up
        fs.unlinkSync(tempPath);

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("Song download error:", err);
        
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        
        let errorMsg = "❌ Download failed: ";
        if (err.message.includes('Sign in to confirm')) {
            errorMsg += "Video is age-restricted. Cannot download.";
        } else if (err.message.includes('Video unavailable')) {
            errorMsg += "Video is unavailable or private.";
        } else {
            errorMsg += err.message || "Unknown error occurred";
        }
        
        await reply(errorMsg);
    }
});
