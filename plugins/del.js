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

        let deletedCount = 0;

        // Try to delete the quoted message (only if it's from the bot)
        if (quoted.key.fromMe) {
            try {
                await conn.sendMessage(from, {
                    delete: {
                        id: quoted.key.id,
                        remoteJid: from,
                        fromMe: true,
                        participant: quoted.key.participant
                    }
                });
                deletedCount++;
            } catch (e) {
                console.log('Cannot delete quoted message:', e.message);
            }
        }

        // Always try to delete the command message (since it's from the bot)
        try {
            await conn.sendMessage(from, {
                delete: {
                    id: mek.key.id,
                    remoteJid: from,
                    fromMe: true,
                    participant: mek.key.participant
                }
            });
            deletedCount++;
        } catch (e) {
            console.log('Cannot delete command message:', e.message);
        }

        // Send feedback
        if (deletedCount > 0) {
            const feedback = await reply(`✅ Deleted ${deletedCount} message(s)`);
            // Auto-delete feedback after 2 seconds
            setTimeout(async () => {
                try {
                    await conn.sendMessage(from, {
                        delete: {
                            id: feedback.key.id,
                            remoteJid: from,
                            fromMe: true
                        }
                    });
                } catch (e) {
                    // Ignore
                }
            }, 2000);
        } else {
            await reply("❌ Could not delete any messages");
        }

    } catch (error) {
        console.error('Delete command error:', error);
        reply("❌ Failed to delete messages.");
    }
});
