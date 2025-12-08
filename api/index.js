// Consolidated API handler - routes all API requests
const { createPayment } = require('./payment');
const { runQuery, getQuery, allQuery } = require('./db');
const { getSubscriptionStatus, activateSubscription, cancelSubscription, hasActiveSubscription } = require('./subscription');
const { getChannelInviteLink, getTelegramUserInfo, sendMessageToUser } = require('./telegram');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get path from URL - handle both /api/path and /path formats
    let path = req.url.split('?')[0];
    const originalPath = path;
    
    if (path.startsWith('/api')) {
        path = path.substring(4) || '/';
    }
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

        // Get current book of month
        if (path === '/book-of-month' && method === 'GET') {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            
            const book = await getQuery(
                'SELECT * FROM book_of_month WHERE month = ? AND year = ? ORDER BY updated_at DESC LIMIT 1',
                [month, year]
            );

            if (!book) {
                // Try to get latest book
                const latestBook = await getQuery(
                    'SELECT * FROM book_of_month ORDER BY year DESC, month DESC LIMIT 1'
                );
                return res.json(latestBook || null);
            }

            return res.json(book);
        }

        // Get latest magazine
        if (path === '/magazine/latest' && method === 'GET') {
            const magazine = await getQuery(
                'SELECT * FROM monthly_magazine ORDER BY issue_number DESC LIMIT 1'
            );
            return res.json(magazine || null);
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

            if (payment.status === 'pending') {
                try {
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
            const subscriptions = await getAllSubscriptions();

            const usersWithInfo = await Promise.all(
                subscriptions.map(async (sub) => {
                    const userInfo = await getTelegramUserInfo(sub.user_id);
                    
                    let daysRemaining = 0;
                    if (sub.subscription_end && sub.subscription_status === 'active') {
                        const endDate = new Date(sub.subscription_end);
                        const now = new Date();
                        const diffTime = endDate - now;
                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        daysRemaining = Math.max(0, daysRemaining);
                    }

                    return {
                        user_id: sub.user_id,
                        username: userInfo?.username || null,
                        first_name: userInfo?.first_name || null,
                        last_name: userInfo?.last_name || null,
                        userpic: userInfo?.photo_url || null,
                        status: sub.subscription_status || 'inactive',
                        subscription_start: sub.subscription_start,
                        subscription_end: sub.subscription_end,
                        days_remaining: daysRemaining,
                        created_at: sub.created_at
                    };
                })
            );

            return res.json({ users: usersWithInfo });
        }

        // Admin: Update book of month
        if (path === '/admin/book-of-month' && method === 'POST') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { month, year, title, author, description, image_url } = req.body;
            if (!month || !year || !title || !author || !description) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            await runQuery(
                `INSERT OR REPLACE INTO book_of_month 
                 (month, year, title, author, description, image_url, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [month, year, title, author, description, image_url || null]
            );

            return res.json({ success: true });
        }

        // Admin: Update magazine
        if (path === '/admin/magazine' && method === 'POST') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { issue_number, title, short_description, full_description, image_url } = req.body;
            if (!issue_number || !title || !short_description || !full_description) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            await runQuery(
                `INSERT OR REPLACE INTO monthly_magazine 
                 (issue_number, title, short_description, full_description, image_url, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [issue_number, title, short_description, full_description, image_url || null]
            );

            return res.json({ success: true });
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

