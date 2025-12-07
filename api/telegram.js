const TelegramBot = require('node-telegram-bot-api');
const { hasActiveSubscription } = require('./subscription');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

let bot = null;

// Initialize bot if token is provided
if (BOT_TOKEN) {
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
}

/**
 * Remove user from channel
 */
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

/**
 * Add user to channel
 */
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

/**
 * Check and manage channel access for all users
 * This should be called by a cron job
 */
async function checkAndManageChannelAccess() {
    const { getAllSubscriptions } = require('./subscription');
    const subscriptions = await getAllSubscriptions();

    let removed = 0;
    let added = 0;

    for (const sub of subscriptions) {
        const hasAccess = await hasActiveSubscription(sub.user_id);
        
        try {
            if (!hasAccess) {
                // Remove from channel
                const result = await removeUserFromChannel(sub.user_id);
                if (result.success) {
                    removed++;
                }
            } else {
                // Ensure user is in channel
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

/**
 * Get channel invite link
 */
async function getChannelInviteLink() {
    if (!bot || !CHANNEL_ID) {
        return null;
    }

    try {
        const chat = await bot.getChat(CHANNEL_ID);
        // Note: You may need to create an invite link manually and store it
        // Telegram Bot API doesn't always provide invite links directly
        return process.env.CHANNEL_INVITE_LINK || `https://t.me/${chat.username || CHANNEL_ID}`;
    } catch (error) {
        console.error('Error getting channel link:', error);
        return process.env.CHANNEL_INVITE_LINK || null;
    }
}

module.exports = {
    removeUserFromChannel,
    addUserToChannel,
    checkAndManageChannelAccess,
    getChannelInviteLink
};

