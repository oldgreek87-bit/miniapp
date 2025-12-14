// Consolidated API handler - routes all API requests
const { createPayment } = require('./payment');
const { runQuery, getQuery, allQuery } = require('./db');
const { getSubscriptionStatus, activateSubscription, cancelSubscription, hasActiveSubscription } = require('./subscription');
const { getChannelInviteLink, getTelegramUserInfo, sendMessageToUser, getBotUsername } = require('./telegram');

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
                if (!latestBook) return res.json(null);
                return res.json(formatBookResponse(latestBook));
            }

            return res.json(formatBookResponse(book));
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

            const { month, year, title, title_en, author, published_at, pages, description, cover_url } = req.body;
            if (!month || !year || !title || !author || !description || !title_en || !published_at || !pages) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            await runQuery(
                `INSERT OR REPLACE INTO book_of_month 
                 (month, year, title, title_en, author, published_at, pages, description, image_url, cover_url, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [month, year, title, title_en, author, published_at, pages, description, cover_url || null, cover_url || null]
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

        // Support: Get bot username for deeplink
        if (path === '/support/bot-username' && method === 'GET') {
            const username = await getBotUsername();
            return res.json({ username: username || 'bookflix_support_bot' });
        }

        // Support: Webhook for receiving messages from Telegram
        if (path === '/support/webhook' && method === 'POST') {
            let update = req.body;
            
            // Parse JSON if body is a string (for Vercel compatibility)
            if (typeof update === 'string') {
                try {
                    update = JSON.parse(update);
                } catch (e) {
                    console.error('Error parsing webhook body:', e);
                    return res.json({ ok: true }); // Return ok to prevent retries
                }
            }
            
            // Handle /start command - send welcome message when user opens chat
            if (update.message && update.message.from && update.message.text === '/start') {
                const userId = update.message.from.id;
                
                // Check if welcome message was already sent to this user
                const existingWelcome = await getQuery(
                    `SELECT id FROM messages WHERE user_id = ? AND is_from_user = 0 AND message_text LIKE '%на связи%' LIMIT 1`,
                    [userId]
                );
                
                // Send welcome message if not sent before
                if (!existingWelcome) {
                    const welcomeMessage = 'Если у вас есть вопрос или нужна помощь — напишите прямо в этот чат, мы на связи🤍';
                    const { sendMessageToUser } = require('./telegram');
                    await sendMessageToUser(userId, welcomeMessage);
                    
                    // Save welcome message to database
                    await runQuery(
                        `INSERT INTO messages (user_id, message_text, is_from_user, created_at)
                         VALUES (?, ?, 0, CURRENT_TIMESTAMP)`,
                        [userId, welcomeMessage]
                    );
                }
                
                return res.json({ ok: true });
            }
            
            // Handle message from user
            if (update.message && update.message.from) {
                const userId = update.message.from.id;
                const messageText = update.message.text || '';
                const messageId = update.message.message_id;

                // Skip /start command as it's handled above
                if (messageText === '/start') {
                    return res.json({ ok: true });
                }

                // Save message to database
                await runQuery(
                    `INSERT INTO messages (user_id, message_text, is_from_user, created_at)
                     VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
                    [userId, messageText]
                );

                // Check if welcome message was sent (for first-time users who didn't use /start)
                const existingWelcome = await getQuery(
                    `SELECT id FROM messages WHERE user_id = ? AND is_from_user = 0 AND message_text LIKE '%на связи%' LIMIT 1`,
                    [userId]
                );
                
                // Check if this is first message from user
                const messageCount = await getQuery(
                    `SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_from_user = 1`,
                    [userId]
                );

                // Send welcome message if first message and welcome not sent yet
                if (messageCount.count === 1 && !existingWelcome) {
                    const welcomeMessage = 'Если у вас есть вопрос или нужна помощь — напишите прямо в этот чат, мы на связи🤍';
                    const { sendMessageToUser } = require('./telegram');
                    await sendMessageToUser(userId, welcomeMessage);
                    
                    // Save welcome message to database
                    await runQuery(
                        `INSERT INTO messages (user_id, message_text, is_from_user, created_at)
                         VALUES (?, ?, 0, CURRENT_TIMESTAMP)`,
                        [userId, welcomeMessage]
                    );
                }

                return res.json({ ok: true });
            }

            return res.json({ ok: true });
        }

        // Admin: Get list of conversations (users with messages)
        if (path === '/admin/conversations' && method === 'GET') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const conversations = await allQuery(`
                SELECT DISTINCT 
                    m.user_id,
                    MAX(m.created_at) as last_message_at,
                    COUNT(CASE WHEN m.is_from_user = 1 THEN 1 END) as unread_count
                FROM messages m
                GROUP BY m.user_id
                ORDER BY last_message_at DESC
            `);

            const conversationsWithInfo = await Promise.all(
                conversations.map(async (conv) => {
                    const userInfo = await getTelegramUserInfo(conv.user_id);
                    const lastMessage = await getQuery(
                        `SELECT message_text, created_at, is_from_user 
                         FROM messages 
                         WHERE user_id = ? 
                         ORDER BY created_at DESC 
                         LIMIT 1`,
                        [conv.user_id]
                    );

                    return {
                        user_id: conv.user_id,
                        username: userInfo?.username || null,
                        first_name: userInfo?.first_name || null,
                        last_name: userInfo?.last_name || null,
                        photo_url: userInfo?.photo_url || null,
                        last_message: lastMessage?.message_text || '',
                        last_message_at: lastMessage?.created_at || conv.last_message_at,
                        unread_count: conv.unread_count || 0
                    };
                })
            );

            return res.json({ conversations: conversationsWithInfo });
        }

        // Admin: Get conversation history
        if (path === '/admin/conversation' && method === 'GET') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { user_id } = req.query;
            if (!user_id) {
                return res.status(400).json({ error: 'Missing user_id parameter' });
            }

            const messages = await allQuery(
                `SELECT id, message_text, is_from_user, created_at
                 FROM messages
                 WHERE user_id = ?
                 ORDER BY created_at ASC`,
                [user_id]
            );

            const userInfo = await getTelegramUserInfo(parseInt(user_id));

            return res.json({
                user_id: parseInt(user_id),
                user_info: userInfo,
                messages: messages
            });
        }

        // Admin: Send reply to user
        if (path === '/admin/send-reply' && method === 'POST') {
            if (!isAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { user_id, message_text } = req.body;
            if (!user_id || !message_text) {
                return res.status(400).json({ error: 'Missing user_id or message_text' });
            }

            // Send message via Telegram
            const result = await sendMessageToUser(parseInt(user_id), message_text);
            
            if (!result.success) {
                return res.status(500).json({ error: result.error || 'Failed to send message' });
            }

            // Save message to database
            await runQuery(
                `INSERT INTO messages (user_id, message_text, is_from_user, created_at)
                 VALUES (?, ?, 0, CURRENT_TIMESTAMP)`,
                [user_id, message_text]
            );

            return res.json({ success: true });
        }

        // 404 for unknown routes
        return res.status(404).json({ error: 'Not found', path });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

function formatBookResponse(book) {
    return {
        month: book.month,
        year: book.year,
        title: book.title,
        title_en: book.title_en || book.title,
        author: book.author,
        published_at: book.published_at || null,
        pages: book.pages || null,
        description: book.description,
        cover_url: book.cover_url || book.image_url || null,
        updated_at: book.updated_at,
        created_at: book.created_at
    };
}

