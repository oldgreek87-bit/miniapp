const { getQuery, runQuery, allQuery } = require('./db');

/**
 * Get subscription status for a user
 */
async function getSubscriptionStatus(userId) {
    const subscription = await getQuery(
        'SELECT * FROM subscriptions WHERE user_id = ?',
        [userId]
    );

    if (!subscription) {
        return {
            status: 'inactive',
            subscription_start: null,
            subscription_end: null,
            days_remaining: 0
        };
    }

    // Calculate days remaining
    let daysRemaining = 0;
    if (subscription.subscription_end && subscription.subscription_status === 'active') {
        const endDate = new Date(subscription.subscription_end);
        const now = new Date();
        const diffTime = endDate - now;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, daysRemaining);
    }

    return {
        status: subscription.subscription_status,
        subscription_start: subscription.subscription_start,
        subscription_end: subscription.subscription_end,
        days_remaining: daysRemaining,
        payment_id: subscription.payment_id
    };
}

/**
 * Activate subscription for a user
 */
async function activateSubscription(userId, days, paymentId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Check if user already has a subscription
    const existing = await getQuery(
        'SELECT * FROM subscriptions WHERE user_id = ?',
        [userId]
    );

    if (existing && existing.subscription_status === 'active') {
        // Extend existing subscription
        const currentEndDate = new Date(existing.subscription_end);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + days);

        await runQuery(
            `UPDATE subscriptions 
             SET subscription_end = ?, 
                 payment_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [newEndDate.toISOString(), paymentId, userId]
        );
    } else {
        // Create new subscription
        await runQuery(
            `INSERT OR REPLACE INTO subscriptions 
             (user_id, subscription_start, subscription_end, subscription_status, payment_id, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                userId,
                startDate.toISOString(),
                endDate.toISOString(),
                'active',
                paymentId
            ]
        );
    }

    // Record payment in history
    await runQuery(
        `INSERT INTO payment_history (user_id, payment_id, amount, days, status, completed_at)
         VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)`,
        [userId, paymentId, 0, days] // Amount would come from payment data
    );

    return {
        success: true,
        subscription_start: startDate.toISOString(),
        subscription_end: endDate.toISOString()
    };
}

/**
 * Cancel subscription
 */
async function cancelSubscription(userId) {
    await runQuery(
        `UPDATE subscriptions 
         SET subscription_status = 'cancelled',
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [userId]
    );

    return { success: true };
}

/**
 * Add days to subscription (admin function)
 */
async function addDays(userId, days) {
    const subscription = await getQuery(
        'SELECT * FROM subscriptions WHERE user_id = ?',
        [userId]
    );

    if (!subscription) {
        throw new Error('Subscription not found');
    }

    const endDate = new Date(subscription.subscription_end || new Date());
    endDate.setDate(endDate.getDate() + days);

    await runQuery(
        `UPDATE subscriptions 
         SET subscription_end = ?,
             subscription_status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [endDate.toISOString(), userId]
    );

    return { success: true, new_end_date: endDate.toISOString() };
}

/**
 * Set subscription status (admin function)
 */
async function setSubscription(userId, status, endDate) {
    await runQuery(
        `INSERT OR REPLACE INTO subscriptions 
         (user_id, subscription_status, subscription_end, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, status, endDate || null]
    );

    return { success: true };
}

/**
 * Get all subscriptions (admin function)
 * Returns all users who have interacted with the system (have subscription or messages)
 */
async function getAllSubscriptions() {
    // Get all users who have subscriptions
    const subscriptions = await allQuery(
        'SELECT * FROM subscriptions ORDER BY created_at DESC'
    );

    // Also get users who have sent messages but don't have subscriptions
    const messageUsers = await allQuery(
        `SELECT DISTINCT user_id FROM messages 
         WHERE user_id NOT IN (SELECT user_id FROM subscriptions)`
    );

    // Create subscription entries for message-only users
    const messageOnlyUsers = messageUsers.map(user => ({
        user_id: user.user_id,
        subscription_start: null,
        subscription_end: null,
        subscription_status: 'inactive',
        payment_id: null,
        created_at: null,
        updated_at: null
    }));

    // Combine and return
    return [...subscriptions, ...messageOnlyUsers];
}

/**
 * Check if user has active subscription
 */
async function hasActiveSubscription(userId) {
    const subscription = await getQuery(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? 
         AND subscription_status = 'active'
         AND subscription_end > datetime('now')`,
        [userId]
    );

    return !!subscription;
}

module.exports = {
    getSubscriptionStatus,
    activateSubscription,
    cancelSubscription,
    addDays,
    setSubscription,
    getAllSubscriptions,
    hasActiveSubscription
};

