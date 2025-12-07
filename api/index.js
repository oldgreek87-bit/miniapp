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

            // For now, simulate payment confirmation
            // In production, check with T-Bank API
            if (payment.status === 'pending') {
                // Activate subscription
                await activateSubscription(user_id, payment.days, payment_id);
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

            const users = subscriptions.map(sub => {
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
                    status: sub.subscription_status,
                    subscription_start: sub.subscription_start,
                    subscription_end: sub.subscription_end,
                    days_remaining: daysRemaining,
                    created_at: sub.created_at
                };
            });

            return res.json({ users });
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

