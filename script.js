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
        showError('Не удалось получить информацию о пользователе. Пожалуйста, откройте приложение из Telegram.');
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
    // Check if user ID is available
    if (!userId) {
        alert('Ошибка: Не удалось получить ID пользователя. Пожалуйста, откройте приложение из Telegram.');
        console.error('User ID not available');
        return;
    }

    try {
        // Show loading state
        const planButtons = document.querySelectorAll('.plan-btn');
        planButtons.forEach(btn => btn.disabled = true);
        
        const amount = getPlanAmount(days);
        console.log('Creating payment:', { user_id: userId, days, amount });

        const response = await fetch(`${API_BASE_URL}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                days: days,
                amount: amount,
            }),
        });

        console.log('Payment response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: Failed to create payment`);
        }

        const data = await response.json();
        console.log('Payment data:', data);

        // Handle payment based on response
        if (data.payment_url) {
            // For now, since T-Bank is mock, simulate successful payment
            // In production, this would open the payment URL
            alert(`Платёжная сессия создана!\n\nID платежа: ${data.payment_id}\nСумма: ${data.amount}₽\nДней: ${data.days}\n\nПримечание: Интеграция T-Bank в тестовом режиме.`);
            
            // Simulate payment confirmation (for testing)
            // In production, remove this and use actual T-Bank webhook
            setTimeout(async () => {
                try {
                    const confirmResponse = await fetch(`${API_BASE_URL}/confirm-payment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            payment_id: data.payment_id,
                            user_id: userId,
                        }),
                    });
                    
                    const confirmData = await confirmResponse.json();
                    if (confirmData.status === 'success') {
                        showConfirmationScreen();
                    }
                } catch (err) {
                    console.error('Payment confirmation error:', err);
                }
            }, 2000);
        } else if (data.widget_html) {
            // Show payment widget
            document.getElementById('paymentWidget').innerHTML = data.widget_html;
            document.getElementById('paymentWidget').classList.remove('hidden');
        } else {
            throw new Error('Invalid payment response: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Payment error details:', error);
        alert('Ошибка: ' + error.message + '\n\nПроверьте консоль браузера (F12) для деталей.');
    } finally {
        // Re-enable buttons
        const planButtons = document.querySelectorAll('.plan-btn');
        planButtons.forEach(btn => btn.disabled = false);
    }
}

function getPlanAmount(days) {
    // Only 1 month plan available
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
    content.innerHTML = '<div class="loading">Загрузка статуса подписки...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/subscription-status?user_id=${userId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Не удалось загрузить подписку');
        }

        renderSubscriptionStatus(data);
    } catch (error) {
        content.innerHTML = `
            <div class="error-message">
                <h2>Ошибка</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderSubscriptionStatus(data) {
    const content = document.getElementById('subscriptionContent');
    const isActive = data.status === 'active';
    const statusClass = isActive ? 'status-active' : 'status-inactive';
    const statusText = isActive ? 'Активна' : 'Неактивна';

    let daysRemaining = 'Н/Д';
    if (data.days_remaining !== null && data.days_remaining !== undefined) {
        const days = data.days_remaining;
        if (days > 0) {
            const dayWord = days === 1 ? 'день' : (days < 5 ? 'дня' : 'дней');
            daysRemaining = `${days} ${dayWord}`;
        } else {
            daysRemaining = 'Истекла';
        }
    }

    let renewalDate = 'Н/Д';
    if (data.subscription_end) {
        const endDate = new Date(data.subscription_end);
        renewalDate = endDate.toLocaleDateString('ru-RU');
    }

    let startDate = 'Н/Д';
    if (data.subscription_start) {
        const start = new Date(data.subscription_start);
        startDate = start.toLocaleDateString('ru-RU');
    }

    content.innerHTML = `
        <div class="subscription-card">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <div class="info-row">
                <span class="info-label">Осталось дней:</span>
                <span class="info-value">${daysRemaining}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Дата окончания:</span>
                <span class="info-value">${renewalDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Дата начала:</span>
                <span class="info-value">${startDate}</span>
            </div>
            <div class="action-buttons">
                ${isActive ? `
                    <button class="action-btn danger" onclick="cancelSubscription()">Отменить подписку</button>
                ` : `
                    <button class="action-btn" onclick="showPurchaseScreen()">Купить подписку</button>
                `}
                <button class="action-btn" onclick="updatePaymentMethod()">Изменить способ оплаты</button>
            </div>
        </div>
    `;
}

async function cancelSubscription() {
    if (!confirm('Вы уверены, что хотите отменить подписку?')) {
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
            throw new Error(data.error || 'Не удалось отменить подписку');
        }

        alert('Подписка успешно отменена');
        showSubscriptionScreen();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function updatePaymentMethod() {
    alert('Изменение способа оплаты будет доступно в ближайшее время.');
}

// Reading Room
async function showReadingRoomScreen() {
    showScreen('readingRoomScreen');
    const content = document.getElementById('readingRoomContent');
    content.innerHTML = '<div class="loading">Проверка доступа...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/reading-room-access?user_id=${userId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Не удалось проверить доступ');
        }

        renderReadingRoomAccess(data);
    } catch (error) {
        content.innerHTML = `
            <div class="error-message">
                <h2>Ошибка</h2>
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
                <h2>Добро пожаловать в Reading Room</h2>
                <p>У вас есть доступ к нашему закрытому каналу книжного клуба.</p>
                <a href="${data.channel_link}" class="join-link" target="_blank">Перейти в Reading Room →</a>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="error-message">
                <h2>Подписка истекла</h2>
                <p>Ваша подписка истекла. Пожалуйста, продлите подписку для доступа к Reading Room.</p>
                <button class="main-button" onclick="showPurchaseScreen()" style="margin-top: 20px;">Купить подписку</button>
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
                <h2>Ошибка</h2>
                <p>${message}</p>
            </div>
        </div>
    `;
}

