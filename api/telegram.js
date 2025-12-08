const TelegramBot = require('node-telegram-bot-api');
const { hasActiveSubscription } = require('./subscription');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

let bot = null;

if (BOT_TOKEN) {
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
}

async function removeUserFromChannel(userId) {
    if (!bot || !CHANNEL_ID) {
        console.warn('Bot or channel not configured');
        return { success: false, error: 'Bot not configured' };
    }

    try {
        await bot.banChatMember(CHANNEL_ID, userId);
        return { success: true };
    } catch (error) {
        console.error('Error removing user from channel:', error);
        return { success: false, error: error.message };
    }
}

async function addUserToChannel(userId) {
    if (!bot || !CHANNEL_ID) {
        console.warn('Bot or channel not configured');
        return { success: false, error: 'Bot not configured' };
    }

    try {
        await bot.unbanChatMember(CHANNEL_ID, userId);
        return { success: true };
    } catch (error) {
        console.error('Error adding user to channel:', error);
        return { success: false, error: error.message };
    }
}

async function checkAndManageChannelAccess() {
    const { getAllSubscriptions } = require('./subscription');
    const subscriptions = await getAllSubscriptions();

    let removed = 0;
    let added = 0;

    for (const sub of subscriptions) {
        const hasAccess = await hasActiveSubscription(sub.user_id);
        
        try {
            if (!hasAccess) {
                const result = await removeUserFromChannel(sub.user_id);
                if (result.success) {
                    removed++;
                }
            } else {
                const result = await addUserToChannel(sub.user_id);
                if (result.success) {
                    added++;
                }
            }
        } catch (error) {
            console.error(`Error managing access for user ${sub.user_id}:`, error);
        }
    }

    return {
        removed,
        added,
        total: subscriptions.length
    };
}

async function getChannelInviteLink() {
    if (!bot || !CHANNEL_ID) {
        return null;
    }

    try {
        const chat = await bot.getChat(CHANNEL_ID);
        return process.env.CHANNEL_INVITE_LINK || `https://t.me/${chat.username || CHANNEL_ID}`;
    } catch (error) {
        console.error('Error getting channel link:', error);
        return process.env.CHANNEL_INVITE_LINK || null;
    }
}

async function getTelegramUserInfo(userId) {
    if (!bot) {
        return null;
    }

    try {
        const user = await bot.getChat(userId);
        const photos = await bot.getUserProfilePhotos(userId, { limit: 1 }).catch(() => null);
        let photoUrl = null;
        
        if (photos && photos.total_count > 0) {
            const file = await bot.getFile(photos.photos[0][0].file_id).catch(() => null);
            if (file) {
                photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
            }
        }

        return {
            username: user.username || null,
            first_name: user.first_name || null,
            last_name: user.last_name || null,
            photo_url: photoUrl
        };
    } catch (error) {
        console.error(`Error getting user info for ${userId}:`, error);
        return null;
    }
}

async function sendMessageToUser(userId, text) {
    if (!bot) {
        return { success: false, error: 'Bot not configured' };
    }

    try {
        await bot.sendMessage(userId, text);
        return { success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    removeUserFromChannel,
    addUserToChannel,
    checkAndManageChannelAccess,
    getChannelInviteLink,
    getTelegramUserInfo,
    sendMessageToUser
};

