const { cmd } = require('../command');

cmd({
    pattern: "x",
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

        // Method 1: Using the correct Baileys delete format
        try {
            // Delete the quoted message first
            await conn.sendMessage(from, {
                delete: {
                    id: quoted.key.id,
                    participant: quoted.key.participant || quoted.key.remoteJid,
                    remoteJid: from,
                    fromMe: quoted.key.fromMe
                }
            });
        } catch (deleteError) {
            console.log('Delete quoted error:', deleteError);
        }

        // Wait a bit before deleting the command message
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Delete the command message
            await conn.sendMessage(from, {
                delete: {
                    id: mek.key.id,
                    participant: mek.key.participant || mek.key.remoteJid,
                    remoteJid: from,
                    fromMe: mek.key.fromMe
                }
            });
        } catch (deleteError2) {
            console.log('Delete command error:', deleteError2);
        }

    } catch (error) {
        console.error('Delete command error:', error);
        reply("❌ Failed to delete messages. Make sure I have permission to delete.");
    }
});
