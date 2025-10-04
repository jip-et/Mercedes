const config = require('../config');
const { cmd } = require('../command');

// Kick/Remove member
cmd({
    pattern: "kick",
    alias: ["remove", "ban"],
    react: "👋",
    desc: "Remove mentioned or replied user from group",
    category: "group",
    use: '.kick @user or reply to message',
    filename: __filename
}, async (conn, mek, m, { from, reply, mentioned, quoted, sender, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");
        if (!isAdmin) return reply("❌ You need to be admin to use this command");

        let users = [];
        
        // Get users from mentions
        if (mentioned && mentioned.length > 0) {
            users = mentioned;
        }
        // Get user from quoted message
        else if (quoted && quoted.sender) {
            users = [quoted.sender];
        } else {
            return reply("❌ Please mention or reply to the user you want to remove");
        }

        // Remove users from group
        for (let user of users) {
            try {
                await conn.groupParticipantsUpdate(from, [user], "remove");
                await reply(`✅ Removed @${user.split('@')[0]} from group`, { mentions: [user] });
            } catch (error) {
                console.error(`Failed to remove ${user}:`, error);
                await reply(`❌ Failed to remove @${user.split('@')[0]}`, { mentions: [user] });
            }
        }

    } catch (error) {
        console.error('Kick command error:', error);
        reply("❌ Failed to remove user(s)");
    }
});

// Tag all members
cmd({
    pattern: "tagall",
    alias: ["everyone", "mentionall"],
    react: "🏷️",
    desc: "Tag all group members",
    category: "group",
    use: '.tagall [message]',
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const groupMetadata = await conn.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        let message = q || "Hello everyone!";
        let mentions = [];
        let tagText = "";

        // Create mention text
        participants.forEach(participant => {
            mentions.push(participant.id);
            tagText += `@${participant.id.split('@')[0]} `;
        });

        await conn.sendMessage(from, {
            text: `${message}\n\n${tagText}`,
            mentions: mentions
        }, { quoted: mek });

    } catch (error) {
        console.error('Tagall command error:', error);
        reply("❌ Failed to tag members");
    }
});

// Tag only admins
cmd({
    pattern: "tagadmin",
    alias: ["admins", "adminmention"],
    react: "👑",
    desc: "Tag all group admins",
    category: "group",
    use: '.tagadmin [message]',
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const groupMetadata = await conn.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        let message = q || "Attention admins!";
        let mentions = [];
        let tagText = "";

        // Filter and tag only admins
        participants.forEach(participant => {
            if (participant.admin) {
                mentions.push(participant.id);
                tagText += `@${participant.id.split('@')[0]} `;
            }
        });

        if (mentions.length === 0) {
            return reply("❌ No admins found in this group");
        }

        await conn.sendMessage(from, {
            text: `${message}\n\n${tagText}`,
            mentions: mentions
        }, { quoted: mek });

    } catch (error) {
        console.error('Tagadmin command error:', error);
        reply("❌ Failed to tag admins");
    }
});

// Close group (admin only)
cmd({
    pattern: "close",
    alias: ["lock", "restrict"],
    react: "🔒",
    desc: "Restrict group to admins only",
    category: "group",
    use: '.close',
    filename: __filename
}, async (conn, mek, m, { from, reply, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");
        if (!isAdmin) return reply("❌ You need to be admin to use this command");

        await conn.groupSettingUpdate(from, 'announcement');
        reply("✅ Group locked! Only admins can send messages");

    } catch (error) {
        console.error('Close command error:', error);
        reply("❌ Failed to lock group");
    }
});

// Open group (admin only)
cmd({
    pattern: "open",
    alias: ["unlock", "unrestrict"],
    react: "🔓",
    desc: "Allow all members to send messages",
    category: "group",
    use: '.open',
    filename: __filename
}, async (conn, mek, m, { from, reply, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");
        if (!isAdmin) return reply("❌ You need to be admin to use this command");

        await conn.groupSettingUpdate(from, 'not_announcement');
        reply("✅ Group unlocked! All members can send messages");

    } catch (error) {
        console.error('Open command error:', error);
        reply("❌ Failed to unlock group");
    }
});

// Get group link
cmd({
    pattern: "grouplink",
    alias: ["gclink", "invitelink", "link"],
    react: "🔗",
    desc: "Get group invite link",
    category: "group",
    use: '.grouplink',
    filename: __filename
}, async (conn, mek, m, { from, reply, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");

        const groupMetadata = await conn.groupMetadata(from);
        const inviteCode = await conn.groupInviteCode(from);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        await conn.sendMessage(from, {
            text: `*Group Invite Link:*\n\n${inviteLink}\n\n*Group Name:* ${groupMetadata.subject}\n*Participants:* ${groupMetadata.participants.length} members`
        }, { quoted: mek });

    } catch (error) {
        console.error('Grouplink command error:', error);
        reply("❌ Failed to get group link. Make sure I'm admin.");
    }
});

// Promote user to admin
cmd({
    pattern: "promote",
    alias: ["admin", "makeadmin"],
    react: "⬆️",
    desc: "Promote user to admin",
    category: "group",
    use: '.promote @user or reply to message',
    filename: __filename
}, async (conn, mek, m, { from, reply, mentioned, quoted, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");
        if (!isAdmin) return reply("❌ You need to be admin to use this command");

        let users = [];
        
        if (mentioned && mentioned.length > 0) {
            users = mentioned;
        } else if (quoted && quoted.sender) {
            users = [quoted.sender];
        } else {
            return reply("❌ Please mention or reply to the user you want to promote");
        }

        for (let user of users) {
            try {
                await conn.groupParticipantsUpdate(from, [user], "promote");
                await reply(`✅ Promoted @${user.split('@')[0]} to admin`, { mentions: [user] });
            } catch (error) {
                console.error(`Failed to promote ${user}:`, error);
                await reply(`❌ Failed to promote @${user.split('@')[0]}`, { mentions: [user] });
            }
        }

    } catch (error) {
        console.error('Promote command error:', error);
        reply("❌ Failed to promote user(s)");
    }
});

// Demote admin to member
cmd({
    pattern: "demote",
    alias: ["removeadmin", "member"],
    react: "⬇️",
    desc: "Demote admin to member",
    category: "group",
    use: '.demote @user or reply to message',
    filename: __filename
}, async (conn, mek, m, { from, reply, mentioned, quoted, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");
        if (!isAdmin) return reply("❌ You need to be admin to use this command");

        let users = [];
        
        if (mentioned && mentioned.length > 0) {
            users = mentioned;
        } else if (quoted && quoted.sender) {
            users = [quoted.sender];
        } else {
            return reply("❌ Please mention or reply to the admin you want to demote");
        }

        for (let user of users) {
            try {
                await conn.groupParticipantsUpdate(from, [user], "demote");
                await reply(`✅ Demoted @${user.split('@')[0]} to member`, { mentions: [user] });
            } catch (error) {
                console.error(`Failed to demote ${user}:`, error);
                await reply(`❌ Failed to demote @${user.split('@')[0]}`, { mentions: [user] });
            }
        }

    } catch (error) {
        console.error('Demote command error:', error);
        reply("❌ Failed to demote user(s)");
    }
});

// Add user to group
cmd({
    pattern: "add",
    alias: ["invite"],
    react: "➕",
    desc: "Add user to group",
    category: "group",
    use: '.add 923xxxxxxxxx or .add @user',
    filename: __filename
}, async (conn, mek, m, { from, reply, mentioned, isBotAdmin, isAdmin }) => {
    try {
        if (!isBotAdmin) return reply("❌ I need to be admin to use this command");
        if (!isAdmin) return reply("❌ You need to be admin to use this command");

        let users = [];
        
        if (mentioned && mentioned.length > 0) {
            users = mentioned;
        } else if (q) {
            // Extract numbers from text
            const numbers = q.match(/[\d+]+/g);
            if (numbers) {
                users = numbers.map(num => {
                    // Format number to WhatsApp ID
                    if (num.startsWith('+')) num = num.substring(1);
                    if (!num.includes('@')) num += '@s.whatsapp.net';
                    return num;
                });
            }
        }

        if (users.length === 0) {
            return reply("❌ Please mention users or provide phone numbers to add");
        }

        for (let user of users) {
            try {
                await conn.groupParticipantsUpdate(from, [user], "add");
                await reply(`✅ Added @${user.split('@')[0]} to group`, { mentions: [user] });
            } catch (error) {
                console.error(`Failed to add ${user}:`, error);
                await reply(`❌ Failed to add @${user.split('@')[0]}`, { mentions: [user] });
            }
        }

    } catch (error) {
        console.error('Add command error:', error);
        reply("❌ Failed to add user(s)");
    }
});

// Hide tag (mentions everyone without showing tags)
cmd({
    pattern: "hidetag",
    alias: ["htag", "stealtag"],
    react: "👻",
    desc: "Tag all members without showing mentions",
    category: "group",
    use: '.hidetag [message]',
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const groupMetadata = await conn.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        let message = q || "Hello everyone!";
        let mentions = participants.map(p => p.id);

        // Send message with hidden mentions
        await conn.sendMessage(from, {
            text: message,
            mentions: mentions
        }, { quoted: mek });

    } catch (error) {
        console.error('Hidetag command error:', error);
        reply("❌ Failed to send hidden tag");
    }
});

// Group info command
cmd({
    pattern: "groupinfo",
    alias: ["ginfo", "info"],
    react: "ℹ️",
    desc: "Get group information",
    category: "group",
    use: '.groupinfo',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const groupMetadata = await conn.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        const admins = participants.filter(p => p.admin).map(p => p.id);
        const owner = participants.find(p => p.admin && p.id === groupMetadata.owner)?.id;

        let infoText = `*Group Information*\n\n`;
        infoText += `*Name:* ${groupMetadata.subject}\n`;
        infoText += `*Description:* ${groupMetadata.desc || 'No description'}\n`;
        infoText += `*Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}\n`;
        infoText += `*Participants:* ${participants.length} members\n`;
        infoText += `*Admins:* ${admins.length} admins\n`;
        infoText += `*Owner:* ${owner ? '@' + owner.split('@')[0] : 'Unknown'}\n`;

        await conn.sendMessage(from, {
            text: infoText,
            mentions: owner ? [owner] : []
        }, { quoted: mek });

    } catch (error) {
        console.error('Groupinfo command error:', error);
        reply("❌ Failed to get group information");
    }
});

// Leave group command
cmd({
    pattern: "leave",
    alias: ["exit", "bye"],
    react: "👋",
    desc: "Make the bot leave the group",
    category: "group",
    use: '.leave',
    filename: __filename
}, async (conn, mek, m, { from, reply, isAdmin }) => {
    try {
        if (!isAdmin) return reply("❌ Only admins can make me leave the group");

        await reply("👋 Goodbye everyone!");
        await conn.groupLeave(from);

    } catch (error) {
        console.error('Leave command error:', error);
        reply("❌ Failed to leave group");
    }
});
