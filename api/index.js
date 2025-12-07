// Consolidated API handler - routes all API requests
const { createPayment } = require('./payment');
const { runQuery, getQuery } = require('./db');
const { getSubscriptionStatus, activateSubscription, cancelSubscription, hasActiveSubscription } = require('./subscription');
const { getChannelInviteLink } = require('./telegram');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get path from URL - handle both /api/path and /path formats
    let path = req.url.split('?')[0]; // Remove query string
    // If path starts with /api, remove it (Vercel routing)
    if (path.startsWith('/api')) {
        path = path.substring(4) || '/';
    }
    // Normalize path
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    const method = req.method;

    try {
        // Health check
        if (path === '/health' || path === '/' || path === '/api') {
            return res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'Bookflix API'
            });
        }

        // Create payment
        if (path === '/create-payment' && method === 'POST') {
            const { user_id, days, amount } = req.body;
            if (!user_id || !days || !amount) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const payment = await createPayment(user_id, amount, days);
            await runQuery(
                `INSERT INTO payment_history (user_id, payment_id, amount, days, status)
                 VALUES (?, ?, ?, ?, 'pending')`,
                [user_id, payment.payment_id, amount, days]
            );

            return res.json({
                payment_id: payment.payment_id,
                payment_url: payment.payment_url,
                amount: payment.amount,
                days: days
            });
        }

        // Confirm payment
        if (path === '/confirm-payment' && method === 'POST') {
            const { payment_id, user_id } = req.body;
            if (!payment_id || !user_id) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const payment = await getQuery(
                'SELECT * FROM payment_history WHERE payment_id = ?',
                [payment_id]
            );

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            // For testing: Auto-confirm pending payments
            // In production, check with T-Bank API first
            if (payment.status === 'pending') {
                try {
                    // Activate subscription
                    await activateSubscription(parseInt(user_id), payment.days, payment_id);
                    await runQuery(
                        `UPDATE payment_history 
                         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                         WHERE payment_id = ?`,
                        [payment_id]
                    );

                    return res.json({
                        status: 'success',
                        message: 'Payment confirmed and subscription activated'
                    });
                } catch (error) {
                    console.error('Error activating subscription:', error);
                    return res.status(500).json({ 
                        status: 'error',
                        error: error.message || 'Failed to activate subscription'
                    });
                }
            }

            return res.json({
                status: payment.status === 'completed' ? 'success' : 'pending',
                message: payment.status === 'completed' ? 'Payment already confirmed' : 'Payment still pending'
            });
        }

        // Subscription status
        if (path === '/subscription-status' && method === 'GET') {
            const { user_id } = req.query;
            if (!user_id) {
                return res.status(400).json({ error: 'Missing user_id parameter' });
            }

            const status = await getSubscriptionStatus(parseInt(user_id));
            return res.json(status);
        }

        // Reading room access
        if (path === '/reading-room-access' && method === 'GET') {
            const { user_id } = req.query;
            if (!user_id) {
                return res.status(400).json({ error: 'Missing user_id parameter' });
            }

            const hasAccess = await hasActiveSubscription(parseInt(user_id));
            if (hasAccess) {
                const channelLink = await getChannelInviteLink();
                return res.json({
                    has_access: true,
                    channel_link: channelLink || process.env.CHANNEL_INVITE_LINK || '#'
                });
            } else {
                return res.json({
                    has_access: false,
                    message: 'Subscription expired'
                });
            }
        }

        // Cancel subscription
        if (path === '/cancel-subscription' && method === 'POST') {
            const { user_id } = req.body;
            if (!user_id) {
                return res.status(400).json({ error: 'Missing user_id' });
            }

            await cancelSubscription(parseInt(user_id));
            return res.json({ success: true, message: 'Subscription cancelled' });
        }

        // Admin endpoints
        const adminToken = req.query.admin_token || req.headers['x-admin-token'] || req.body?.admin_token;
        const isAdmin = adminToken === process.env.ADMIN_SECRET_TOKEN;

        // Admin: Get users
        if (path === '/admin/users' && method === 'GET') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { getAllSubscriptions } = require('./subscription');
            const { getTelegramUserInfo } = require('./telegram');
            const subscriptions = await getAllSubscriptions();

            // Get all unique user IDs (including those without subscriptions)
            const allUserIds = new Set(subscriptions.map(s => s.user_id));
            
            // Get user info from Telegram for all users
            const usersWithInfo = await Promise.all(
                Array.from(allUserIds).map(async (userId) => {
                    const sub = subscriptions.find(s => s.user_id === userId);
                    const userInfo = await getTelegramUserInfo(userId);
                    
                    let daysRemaining = 0;
                    if (sub && sub.subscription_end && sub.subscription_status === 'active') {
                        const endDate = new Date(sub.subscription_end);
                        const now = new Date();
                        const diffTime = endDate - now;
                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        daysRemaining = Math.max(0, daysRemaining);
                    }

                    return {
                        user_id: userId,
                        username: userInfo?.username || null,
                        first_name: userInfo?.first_name || null,
                        last_name: userInfo?.last_name || null,
                        userpic: userInfo?.photo_url || null,
                        status: sub?.subscription_status || 'inactive',
                        subscription_start: sub?.subscription_start || null,
                        subscription_end: sub?.subscription_end || null,
                        days_remaining: daysRemaining,
                        created_at: sub?.created_at || null
                    };
                })
            );

            return res.json({ users: usersWithInfo });
        }

        // Admin: Add days
        if (path === '/admin/add-days' && method === 'POST') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { user_id, days } = req.body;
            if (!user_id || !days) {
                return res.status(400).json({ error: 'Missing user_id or days' });
            }

            const { addDays } = require('./subscription');
            const result = await addDays(parseInt(user_id), parseInt(days));
            return res.json({ success: true, ...result });
        }

        // Admin: Set subscription
        if (path === '/admin/set-subscription' && method === 'POST') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { user_id, status, end_date } = req.body;
            if (!user_id || !status) {
                return res.status(400).json({ error: 'Missing user_id or status' });
            }

            const { setSubscription } = require('./subscription');
            const result = await setSubscription(parseInt(user_id), status, end_date);
            return res.json({ success: true, ...result });
        }

        // Admin: Get messages for a user
        if (path === '/admin/messages' && method === 'GET') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { user_id } = req.query;
            if (!user_id) {
                return res.status(400).json({ error: 'Missing user_id' });
            }

            const { allQuery } = require('./db');
            const messages = await allQuery(
                'SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC',
                [parseInt(user_id)]
            );

            return res.json({ messages });
        }

        // Admin: Send message to user
        if (path === '/admin/send-message' && method === 'POST') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { user_id, message_text } = req.body;
            if (!user_id || !message_text) {
                return res.status(400).json({ error: 'Missing user_id or message_text' });
            }

            const { sendMessageToUser } = require('./telegram');
            const { runQuery } = require('./db');

            // Send message via Telegram
            const sendResult = await sendMessageToUser(parseInt(user_id), message_text);

            if (sendResult.success) {
                // Save message to database
                await runQuery(
                    'INSERT INTO messages (user_id, message_text, is_from_user, created_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP)',
                    [parseInt(user_id), message_text]
                );
            }

            return res.json(sendResult);
        }

        // Webhook: Receive message from user (to be called by Telegram bot)
        if (path === '/webhook/message' && method === 'POST') {
            const { message } = req.body;
            
            if (message && message.from && message.text) {
                const { runQuery } = require('./db');
                
                // Save user message to database
                await runQuery(
                    'INSERT INTO messages (user_id, message_text, is_from_user, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
                    [message.from.id, message.text]
                );

                return res.json({ success: true });
            }

            return res.status(400).json({ error: 'Invalid message format' });
        }

        // Cron job
        if (path === '/cron' && method === 'POST') {
            const authHeader = req.headers['authorization'];
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { checkAndManageChannelAccess } = require('./telegram');
            const result = await checkAndManageChannelAccess();
            return res.json({
                success: true,
                message: 'Channel access updated',
                ...result
            });
        }

        // 404 for unknown routes
        return res.status(404).json({ error: 'Not found', path });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

