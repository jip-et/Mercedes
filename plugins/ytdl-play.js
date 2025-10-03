const { malvin } = require('../malvin');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// YouTube download function with multiple API fallbacks
malvin({
    pattern: "play",
    alias: ["ytplay", "ytmp3", "song", "audio"],
    react: "🎵",
    desc: "Download YouTube audio by name or link",
    category: "download",
    use: '.play <song name or YouTube URL>',
    filename: __filename
}, async (malvin, mek, m, { from, reply, q }) => {
    try {
        let input = q || (m.quoted && m.quoted.text?.trim());
        if (!input) return reply("❌ *Please enter a song name or YouTube link!*");

        await reply("🔍 *Searching YouTube...*");

        // Search YouTube
        const search = await ytsearch(input);
        const vid = search?.results?.[0];
        if (!vid || !vid.url) return reply("❌ *No results found!*");

        const title = vid.title.replace(/[^\w\s.-]/gi, "").slice(0, 50);
        const videoUrl = vid.url;
        const duration = vid.timestamp || "Unknown";
        const views = vid.views || "Unknown";
        const author = vid.author?.name || "Unknown";
        
        const outputPath = path.join(__dirname, 'temp', `${Date.now()}_${title}.mp3`);
        
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Send video info
        await malvin.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `
╭───〘 🎬 𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝙸𝙽𝙵𝙾 〙───◆
│ 📝 *ᴛɪᴛʟᴇ:* ${vid.title}
│ ⏱️ *ᴅᴜʀᴀᴛɪᴘɴ:* ${duration}
│ 👁️ *ᴠɪᴇᴡs:* ${views}
│ 👤 *ᴀᴜᴛʜᴏʀ:* ${author}
│ 🔗 *ᴜʀʟ:* ${videoUrl}
╰───────────────◆
🎧 *Downloading audio...*
            `.trim()
        }, { quoted: mek });

        // Multiple API endpoints as fallbacks
        const apis = [
            `https://apis-malvin.vercel.app/download/dlmp3?url=${videoUrl}`,
            `https://apis.davidcyriltech.my.id/youtube/mp3?url=${videoUrl}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${videoUrl}`,
            `https://api.dreaded.site/api/ytdl/audio?url=${videoUrl}`,
            `https://jawad-tech.vercel.app/download/ytmp3?url=${videoUrl}`,
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${videoUrl}`
        ];

        let success = false;
        let usedApi = "";

        for (const api of apis) {
            try {
                console.log(`Trying API: ${api}`);
                const res = await axios.get(api, { timeout: 30000 });
                
                // Extract audio URL from different API response formats
                let audioUrl = res.data?.result?.downloadUrl || 
                             res.data?.url ||
                             res.data?.data?.downloadURL ||
                             res.data?.result ||
                             res.data?.downloadUrl;

                if (!audioUrl) {
                    console.warn(`No audio URL found in API response: ${api}`);
                    continue;
                }

                usedApi = api;
                console.log(`Downloading from: ${audioUrl}`);

                // Download and convert audio
                const stream = await axios({
                    url: audioUrl,
                    method: "GET",
                    responseType: "stream",
                    timeout: 60000
                });

                if (stream.status !== 200) {
                    console.warn(`Stream failed with status: ${stream.status}`);
                    continue;
                }

                // Convert to MP3 using ffmpeg
                await new Promise((resolve, reject) => {
                    ffmpeg(stream.data)
                        .audioCodec('libmp3lame')
                        .audioBitrate(128)
                        .format('mp3')
                        .on('end', () => {
                            console.log('Audio conversion completed');
                            resolve();
                        })
                        .on('error', (err) => {
                            console.error('FFmpeg error:', err);
                            reject(err);
                        })
                        .on('progress', (progress) => {
                            console.log(`Processing: ${progress.percent}% done`);
                        })
                        .save(outputPath);
                });

                // Verify file was created
                if (!fs.existsSync(outputPath)) {
                    throw new Error('Output file not created');
                }

                const fileStats = fs.statSync(outputPath);
                if (fileStats.size === 0) {
                    throw new Error('Output file is empty');
                }

                console.log(`File created successfully: ${outputPath} (${fileStats.size} bytes)`);

                // Send audio file
                await malvin.sendMessage(from, {
                    audio: fs.readFileSync(outputPath),
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`,
                    ptt: false
                }, { quoted: mek });

                // Clean up
                fs.unlinkSync(outputPath);
                success = true;
                
                // Send success reaction
                await malvin.sendMessage(from, { 
                    react: { text: "✅", key: mek.key } 
                });
                
                break;

            } catch (err) {
                console.warn(`⚠️ API failed: ${api} -`, err.message);
                continue;
            }
        }

        if (!success) {
            // Try one final fallback - send audio directly without conversion
            for (const api of apis) {
                try {
                    const res = await axios.get(api, { timeout: 30000 });
                    let audioUrl = res.data?.result?.downloadUrl || 
                                 res.data?.url ||
                                 res.data?.data?.downloadURL ||
                                 res.data?.result;

                    if (audioUrl) {
                        await malvin.sendMessage(from, {
                            audio: { url: audioUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${title}.mp3`
                        }, { quoted: mek });
                        
                        await malvin.sendMessage(from, { 
                            react: { text: "✅", key: mek.key } 
                        });
                        success = true;
                        break;
                    }
                } catch (finalErr) {
                    continue;
                }
            }
        }

        if (!success) {
            await malvin.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            reply("🚫 *All download servers failed. Please try again later.*");
        }

    } catch (e) {
        console.error("❌ Error in .play command:", e);
        
        // Clean up temp file if it exists
        try {
            const tempFiles = fs.readdirSync(path.join(__dirname, 'temp'));
            tempFiles.forEach(file => {
                if (file.includes('_temp_')) {
                    fs.unlinkSync(path.join(__dirname, 'temp', file));
                }
            });
        } catch (cleanupErr) {
            // Ignore cleanup errors
        }
        
        await malvin.sendMessage(from, { 
            react: { text: "❌", key: mek.key } 
        });
        reply("🚨 *Something went wrong!*\n" + e.message);
    }
});

// Video download command
malvin({
    pattern: "play4",
    alias: ["ytmp4", "ytvideo"],
    react: "🎬",
    desc: "Download YouTube video",
    category: "download",
    use: '.play4 <video name or YouTube URL>',
    filename: __filename
}, async (malvin, mek, m, { from, reply, q }) => {
    try {
        let input = q || (m.quoted && m.quoted.text?.trim());
        if (!input) return reply("❌ *Please enter a video name or YouTube link!*");

        await reply("🔍 *Searching YouTube...*");

        // Search YouTube
        const search = await ytsearch(input);
        const vid = search?.results?.[0];
        if (!vid || !vid.url) return reply("❌ *No results found!*");

        const title = vid.title.replace(/[^\w\s.-]/gi, "").slice(0, 50);
        const videoUrl = vid.url;

        // Send video info
        await malvin.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `
╭───〘 🎬 𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚅𝙸𝙳𝙴𝙾 〙───◆
│ 📝 *ᴛɪᴛʟᴇ:* ${vid.title}
│ ⏱️ *ᴅᴜʀᴀᴛɪᴘɴ:* ${vid.timestamp || "Unknown"}
│ 👁️ *ᴠɪᴇᴡs:* ${vid.views || "Unknown"}
│ 👤 *ᴀᴜᴛʜᴏʀ:* ${vid.author?.name || "Unknown"}
╰───────────────◆
🎬 *Downloading video...*
            `.trim()
        }, { quoted: mek });

        // Video download APIs
        const videoApis = [
            `https://jawad-tech.vercel.app/download/ytmp4?url=${videoUrl}`,
            `https://apis.davidcyriltech.my.id/youtube/mp4?url=${videoUrl}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${videoUrl}`
        ];

        let success = false;

        for (const api of videoApis) {
            try {
                const res = await axios.get(api, { timeout: 30000 });
                
                let videoUrl = res.data?.result?.download || 
                             res.data?.downloadUrl ||
                             res.data?.url;

                if (videoUrl) {
                    await malvin.sendMessage(from, {
                        video: { url: videoUrl },
                        caption: `> *${vid.title}*`,
                        fileName: `${title}.mp4`
                    }, { quoted: mek });

                    await malvin.sendMessage(from, { 
                        react: { text: "✅", key: mek.key } 
                    });
                    success = true;
                    break;
                }
            } catch (err) {
                console.warn(`Video API failed: ${api} -`, err.message);
                continue;
            }
        }

        if (!success) {
            await malvin.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            reply("🚫 *All video download servers failed. Please try again later.*");
        }

    } catch (e) {
        console.error("❌ Error in .play4 command:", e);
        await malvin.sendMessage(from, { 
            react: { text: "❌", key: mek.key } 
        });
        reply("🚨 *Something went wrong while downloading video!*");
    }
});
