// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// API Base URL - Uses same origin as the app
const API_BASE_URL = window.location.origin + '/api';

// Get Telegram user data
const user = tg.initDataUnsafe?.user;
const userId = user?.id;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (!userId) {
        showError('Unable to get user information. Please open this app from Telegram.');
        return;
    }

    // Setup button handlers
    document.getElementById('purchaseBtn').addEventListener('click', showPurchaseScreen);
    document.getElementById('subscriptionBtn').addEventListener('click', showSubscriptionScreen);
    document.getElementById('readingRoomBtn').addEventListener('click', showReadingRoomScreen);
});

// Navigation functions
function showHome() {
    hideAllScreens();
    document.querySelector('main').classList.remove('hidden');
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.querySelector('main').classList.add('hidden');
}

function showScreen(screenId) {
    hideAllScreens();
    document.getElementById(screenId).classList.remove('hidden');
}

// Purchase Subscription
function showPurchaseScreen() {
    showScreen('purchaseScreen');
    document.getElementById('paymentWidget').classList.add('hidden');
    document.getElementById('purchaseContent').style.display = 'block';
}

async function selectPlan(days) {
    try {
        const response = await fetch(`${API_BASE_URL}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                days: days,
                amount: getPlanAmount(days),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create payment');
        }

        // Handle payment based on response
        if (data.payment_url) {
            // Redirect to payment URL
            window.open(data.payment_url, '_blank');
            // Poll for payment confirmation
            pollPaymentStatus(data.payment_id);
        } else if (data.widget_html) {
            // Show payment widget
            document.getElementById('paymentWidget').innerHTML = data.widget_html;
            document.getElementById('paymentWidget').classList.remove('hidden');
        } else {
            throw new Error('Invalid payment response');
        }
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Payment error:', error);
    }
}

function getPlanAmount(days) {
    if (days === 30) return 299;
    if (days === 90) return 799;
    if (days === 365) return 2499;
    return 299;
}

async function pollPaymentStatus(paymentId) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`${API_BASE_URL}/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    user_id: userId,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                clearInterval(interval);
                showConfirmationScreen();
            } else if (data.status === 'failed' || attempts >= maxAttempts) {
                clearInterval(interval);
                alert('Payment failed or timed out. Please try again.');
            }
        } catch (error) {
            console.error('Payment status check error:', error);
            if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }
    }, 5000); // Check every 5 seconds
}

// My Subscription
async function showSubscriptionScreen() {
    showScreen('subscriptionScreen');
    const content = document.getElementById('subscriptionContent');
    content.innerHTML = '<div class="loading">Loading subscription status...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/subscription-status?user_id=${userId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load subscription');
        }

        renderSubscriptionStatus(data);
    } catch (error) {
        content.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderSubscriptionStatus(data) {
    const content = document.getElementById('subscriptionContent');
    const isActive = data.status === 'active';
    const statusClass = isActive ? 'status-active' : 'status-inactive';
    const statusText = isActive ? 'Active' : 'Inactive';

    let daysRemaining = 'N/A';
    if (data.days_remaining !== null && data.days_remaining !== undefined) {
        daysRemaining = data.days_remaining > 0 ? `${data.days_remaining} days` : 'Expired';
    }

    let renewalDate = 'N/A';
    if (data.subscription_end) {
        const endDate = new Date(data.subscription_end);
        renewalDate = endDate.toLocaleDateString();
    }

    content.innerHTML = `
        <div class="subscription-card">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <div class="info-row">
                <span class="info-label">Days Remaining:</span>
                <span class="info-value">${daysRemaining}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Renewal Date:</span>
                <span class="info-value">${renewalDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Start Date:</span>
                <span class="info-value">${data.subscription_start ? new Date(data.subscription_start).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="action-buttons">
                ${isActive ? `
                    <button class="action-btn danger" onclick="cancelSubscription()">Cancel Subscription</button>
                ` : `
                    <button class="action-btn" onclick="showPurchaseScreen()">Purchase Subscription</button>
                `}
                <button class="action-btn" onclick="updatePaymentMethod()">Update Payment Method</button>
            </div>
        </div>
    `;
}

async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cancel-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to cancel subscription');
        }

        alert('Subscription cancelled successfully');
        showSubscriptionScreen();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function updatePaymentMethod() {
    alert('Payment method update will be available soon.');
}

// Reading Room
async function showReadingRoomScreen() {
    showScreen('readingRoomScreen');
    const content = document.getElementById('readingRoomContent');
    content.innerHTML = '<div class="loading">Checking access...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/reading-room-access?user_id=${userId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to check access');
        }

        renderReadingRoomAccess(data);
    } catch (error) {
        content.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderReadingRoomAccess(data) {
    const content = document.getElementById('readingRoomContent');

    if (data.has_access) {
        content.innerHTML = `
            <div class="access-message">
                <h2>Welcome to Reading Room</h2>
                <p>You have access to our private book club channel.</p>
                <a href="${data.channel_link}" class="join-link" target="_blank">Join Reading Room →</a>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="error-message">
                <h2>Subscription Expired</h2>
                <p>Your subscription has expired. Please renew to access the Reading Room.</p>
                <button class="main-button" onclick="showPurchaseScreen()" style="margin-top: 20px;">Purchase Subscription</button>
            </div>
        `;
    }
}

// Confirmation Screen
function showConfirmationScreen() {
    showScreen('confirmationScreen');
}

function showError(message) {
    document.body.innerHTML = `
        <div class="container">
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        </div>
    `;
}

