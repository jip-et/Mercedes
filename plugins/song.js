const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

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
        const q = args.join(' ');

        if (!q || q.trim() === '') {
            return await reply('❌ Please provide a song name or YouTube URL');
        }

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        let videoUrl = q;
        let videoData = null;

        // If it's not a URL, search for the video
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            const search = await yts(q);
            if (!search?.videos || search.videos.length === 0) {
                return await reply('❌ No results found for your search');
            }
            videoData = search.videos[0];
            videoUrl = videoData.url;
        } else {
            // If it's a URL, get video info
            const search = await yts({ videoId: extractVideoId(videoUrl) });
            videoData = search;
        }

        if (!videoData) {
            return await reply('❌ Could not get video information');
        }

        const desc = `
*🎵 ᴍᴇʀᴄᴇᴅᴇs ᴍᴜsɪᴄ*

📌 *Title:* ${videoData.title}
⏱️ *Duration:* ${videoData.timestamp}
👁️ *Views:* ${videoData.views}
🔗 *Channel:* ${videoData.author.name}

> Use this online converter:
> 🌐 https://ytmp3.cc
> 🔗 Copy this URL: ${videoUrl}

*Or try these alternatives:*
• y2mate.com
• ytmp3.nu
• onlinevideoconverter.com
`;

        // Send song info with download instructions
        await conn.sendMessage(from, {
            image: { url: videoData.thumbnail },
            caption: desc,
            buttons: [
                {
                    buttonId: `!convert ${videoUrl}`,
                    buttonText: { displayText: '🔗 Copy URL' },
                    type: 1
                },
                {
                    buttonId: `!search ${q}`,
                    buttonText: { displayText: '🔍 Search Again' },
                    type: 1
                }
            ]
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("Song command error:", err);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply('❌ Error: ' + (err.message || 'Failed to process request'));
    }
});

function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
