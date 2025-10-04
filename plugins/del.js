const { cmd } = require('../command');

cmd({
    pattern: "trash",
    alias: ["delete", "remove"],
    react: "🗑️",
    desc: "Delete quoted message and command message (Owner only)",
    category: "owner",
    use: '.del (reply to a message)',
    filename: __filename
}, async (conn, mek, m, { from, reply, quoted, isOwner }) => {
    try {
        if (!isOwner) {
            return reply("❌ This is an owner-only command");
        }

        if (!quoted) {
            return reply("❌ Please reply to the message you want to delete");
        }

        // Delete the quoted message
        await conn.sendMessage(from, {
            delete: {
                id: quoted.key.id,
                remoteJid: from,
                fromMe: quoted.key.fromMe
            }
        });

        // Delete the command message (.del)
        await conn.sendMessage(from, {
            delete: {
                id: mek.key.id,
                remoteJid: from,
                fromMe: mek.key.fromMe
            }
        });

    } catch (error) {
        console.error('Delete command error:', error);
        reply("❌ Failed to delete messages. Make sure I have permission to delete.");
    }
});
