// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// API Base URL
const API_BASE_URL = window.location.origin + '/api';

// Get Telegram user data
const user = tg.initDataUnsafe?.user;
const userId = user?.id;

// Swipe state
let touchStartX = 0;
let touchEndX = 0;
let currentSection = 'book'; // 'book' or 'magazine'

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (!userId) {
        showError('Не удалось получить информацию о пользователе. Пожалуйста, откройте приложение из Telegram.');
        return;
    }

    // Load book and magazine
    loadBookOfMonth();
    loadMagazine();

    // Setup button handlers
    const purchaseBtn = document.getElementById('purchaseBtn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => window.location.href = 'subscription.html');
    }

    const subscriptionBtn = document.getElementById('subscriptionBtn');
    if (subscriptionBtn) {
        subscriptionBtn.addEventListener('click', () => window.location.href = 'subscription.html');
    }

    const navSubscription = document.getElementById('nav-subscription');
    if (navSubscription) {
        navSubscription.onclick = () => window.location.href = 'subscription.html';
    } else {
        document.querySelectorAll('.tab-item[data-tab="subscription"]').forEach(btn => {
            btn.onclick = () => window.location.href = 'subscription.html';
        });
    }

    const readingRoomBtn = document.getElementById('readingRoomBtn');
    if (readingRoomBtn) {
        readingRoomBtn.addEventListener('click', showReadingRoomScreen);
    }

    // Support button handler
    const supportBtn = document.getElementById('readingRoomTabBtn');
    if (supportBtn) {
        supportBtn.addEventListener('click', openSupportChat);
    }
    
    // Support button in subscription page
    document.querySelectorAll('.tab-item[data-tab="readingRoom"]').forEach(btn => {
        btn.addEventListener('click', openSupportChat);
    });

    // Setup swipe handlers
    setupSwipe();

    const descWrapper = document.getElementById('bookDescription');
    if (descWrapper) {
        descWrapper.addEventListener('click', toggleBookDescription);
    }

    // Subscription page init
    const subPage = document.querySelector('.subscription-body');
    if (subPage) {
        loadSubscriptionScreen();
    }
});

// Load Book of Month
async function loadBookOfMonth() {
    try {
        const response = await fetch(`${API_BASE_URL}/book-of-month`);
        const data = await response.json();

        const bookTitleEl = document.getElementById('bookTitle');
        const bookAuthorEl = document.getElementById('bookAuthor');
        const bookDateEl = document.getElementById('bookDate');
        const bookPagesEl = document.getElementById('bookPages');
        const bookDescWrap = document.getElementById('bookDescription');
        const bookDescText = document.getElementById('bookDescriptionText');
        const fadeMask = bookDescWrap.querySelector('.fade-mask');
        const skeletons = {
            title: document.getElementById('bookTitleSkeleton'),
            author: document.getElementById('bookAuthorSkeleton'),
            publish: document.getElementById('bookPublishSkeleton'),
            description: document.getElementById('bookDescriptionSkeleton'),
        };

        const book = data && data.title ? data : null;

        if (book) {
            bookTitleEl.textContent = book.title_en || book.title || '—';
            bookAuthorEl.textContent = book.author || '—';

            const dateText = book.published_at ? formatDate(book.published_at) : '—';
            bookDateEl.textContent = dateText;
            bookPagesEl.textContent = book.pages ? `${book.pages} стр.` : '—';

            if (book.description) {
                bookDescText.textContent = book.description;
                bookDescWrap.style.display = 'block';
                resetDescriptionCollapse(bookDescWrap, bookDescText, fadeMask);
            } else {
                bookDescText.textContent = '';
                bookDescWrap.style.display = 'none';
            }

            const cover = book.cover_url || book.image_url;
            if (cover) {
                const img = document.getElementById('bookImage');
                img.src = cover;
                img.onerror = function() {
                    this.src = 'book-of-month.png';
                };
            }
            setBookLoadingState(false, skeletons);
        } else {
            // Default fallback without overriding title
            bookTitleEl.textContent = 'The Twelve Days of Christmas';
            bookAuthorEl.textContent = 'Сьюзан Стоукс-Чепмен';
            bookDateEl.textContent = 'Декабрь 2025';
            bookPagesEl.textContent = '320 стр.';
            bookDescText.textContent = `Друзья, декабрь — это наш месяц уютных традиций. Может, когда-нибудь мы и нарушим правило, но обычно в это время года хочется ровно того, что мы вам сейчас предложим.

Читаем "Двенадцать дней Рождества" Сьюзан Стоукс-Чепмен — роман, который критики описывают как "Джейн Остин встречает Аббатство Даунтон".

Снежная деревушка Мерривэйк. Регентская Англия. Позади — наполеоновские войны, впереди — самый ожидаемый бал сезона в поместье виконта. Но до Двенадцатой ночи ещё двенадцать дней, и каждый таит свою историю.

Книга устроена изящно: каждая глава — почти отдельная история, вдохновлённая строчкой из рождественской песни (куропатка на грушевом дереве, барабанщик, волынщик...). Но все они переплетаются, герои перетекают из главы в главу, а к финалу все нити сходятся на грандиозном балу.

Укутывайтесь в плед, заваривайте чай — и присоединяйтесь к нашей декабрьской традиции. Обещаем атмосферу теплее глинтвейна у камина.`;
            resetDescriptionCollapse(bookDescWrap, bookDescText, fadeMask);
            setBookLoadingState(false, skeletons);
        }
    } catch (error) {
        console.error('Error loading book:', error);
        setBookLoadingState(false);
    }
}

function formatDate(dateString) {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function resetDescriptionCollapse(wrapper, textEl, maskEl) {
    if (!wrapper || !textEl) return;
    wrapper.classList.add('collapsed');
    textEl.style.maxHeight = '160px';
    textEl.style.webkitMaskImage = '';
    textEl.style.maskImage = '';
    if (maskEl) maskEl.style.display = 'block';
}

function setBookLoadingState(isLoading, skeletons = {}) {
    const titleEl = document.getElementById('bookTitle');
    const authorEl = document.getElementById('bookAuthor');
    const publishEl = document.querySelector('.meta-publish');
    const descEl = document.getElementById('bookDescriptionText');

    if (titleEl) titleEl.style.display = isLoading ? 'none' : 'block';
    if (authorEl) authorEl.style.display = isLoading ? 'none' : 'block';
    if (publishEl) publishEl.style.display = isLoading ? 'none' : 'block';
    if (descEl) descEl.style.display = isLoading ? 'none' : 'block';

    if (skeletons.title) skeletons.title.style.display = isLoading ? 'block' : 'none';
    if (skeletons.author) skeletons.author.style.display = isLoading ? 'block' : 'none';
    if (skeletons.publish) skeletons.publish.style.display = isLoading ? 'block' : 'none';
    if (skeletons.description) skeletons.description.style.display = isLoading ? 'block' : 'none';
}

function toggleBookDescription() {
    const wrapper = document.getElementById('bookDescription');
    const textEl = document.getElementById('bookDescriptionText');
    const maskEl = wrapper?.querySelector('.fade-mask');
    if (!wrapper || !textEl) return;

    const isCollapsed = wrapper.classList.contains('collapsed');
    if (isCollapsed) {
        wrapper.classList.remove('collapsed');
        textEl.style.maxHeight = 'none';
        if (maskEl) maskEl.style.display = 'none';
    } else {
        resetDescriptionCollapse(wrapper, textEl, maskEl);
    }
}

// Load Magazine
async function loadMagazine() {
    try {
        const response = await fetch(`${API_BASE_URL}/magazine/latest`);
        const data = await response.json();

        if (data && data.title) {
            document.getElementById('magazineTitle').textContent = data.title;
            document.getElementById('magazineShortDescription').textContent = data.short_description;
            document.getElementById('magazineFullDescription').textContent = data.full_description;
            
            if (data.image_url) {
                const img = document.getElementById('magazineImage');
                img.src = data.image_url;
                img.onerror = function() {
                    this.src = 'magazine-22.png';
                };
            }
        } else {
            // Default magazine
            document.getElementById('magazineTitle').textContent = 'Bookflix Monthly';
            document.getElementById('magazineShortDescription').textContent = 'Bookflix Monthly - это наш клубный журнал, в котором мы публикуем статьи о книгах, пишем забавные фанфики, сочиняем статьи от лица книжных персонажей в духе life style журналов, а также иногда публикуем серьёзные и полезные гайды о том, как искать и интерпретировать символы в книгах и прочие-прочие околокнижные истории.';
            document.getElementById('magazineFullDescription').textContent = `Комната, которая помнит твой страх

В ночь Хэллоуина выходит выпуск о том, что остаётся после прочитанного. О книгах, которые меняют детей навсегда. О частоте, которую слышат только они. О комнатах, где когда-то читали что-то, что нельзя было забыть.

Внутри: архитектура страха, метафоры, которые оказались правдой, слова для сумерек, и паранормальное исследование того, что ты потерял, когда вырос.

Кто-то наблюдает. Кто-то собирает эти моменты. Кто-то помнит всё за тебя. В этом выпуске редакторское кресло занял Наблюдатель — тот, кто стоял в углу твоей комнаты, когда ты читал под одеялом с фонариком.

Bookflix n˚22: The Rooms Issue

Путешествие по детским комнатам, где страшные книги читались впервые — и оставили след навсегда

🎃 Журнал уже отправлен членам клуба с годовым абонементом в боте, проверяйте и читайте прямо сейчас. Если осмелитесь.`;
        }
    } catch (error) {
        console.error('Error loading magazine:', error);
    }
}

// Setup swipe functionality
function setupSwipe() {
    const bookContainer = document.querySelector('.book-container');
    const magazineContainer = document.querySelector('.magazine-container');
    
    if (!bookContainer || !magazineContainer) return;

    const containers = [bookContainer, magazineContainer];
    
    containers.forEach(container => {
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    });
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - show magazine
            showMagazine();
        } else {
            // Swipe right - show book
            showBook();
        }
    }
}

function showBook() {
    currentSection = 'book';
    document.getElementById('bookSection').classList.add('active');
    document.getElementById('magazineSection').classList.remove('active');
}

function showMagazine() {
    currentSection = 'magazine';
    document.getElementById('magazineSection').classList.add('active');
    document.getElementById('bookSection').classList.remove('active');
}

// Toggle descriptions
function toggleBookDescription() {
    const content = document.getElementById('bookDescription');
    const icon = document.getElementById('bookExpandIcon');
    
    content.classList.toggle('expanded');
    icon.classList.toggle('expanded');
}

function toggleMagazineDescription() {
    const content = document.getElementById('magazineDescription');
    const icon = document.getElementById('magazineExpandIcon');
    
    content.classList.toggle('expanded');
    icon.classList.toggle('expanded');
}

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

// Subscription Page Logic
async function loadSubscriptionScreen() {
    const fallback = {
        status: 'inactive',
        subscription_end: null,
        history: []
    };

    try {
        const data = await fetchSubscriptionData();
        renderSubscription(data || fallback);
    } catch (error) {
        console.error('Subscription load error:', error);
        renderSubscription(fallback);
    }
}

async function fetchSubscriptionData() {
    const res = await fetch(`${API_BASE_URL}/subscription-status?user_id=${userId}`);
    if (!res.ok) throw new Error('Failed to load subscription');
    return await res.json();
}

function renderSubscription(data) {
    const badge = document.getElementById('subStatusBadge');
    const endDate = document.getElementById('subEndDate');
    const historyList = document.getElementById('historyList');
    const historySection = document.getElementById('historySection');
    const accessStatus = document.getElementById('accessStatus');
    const accessActionBtn = document.getElementById('accessActionBtn');

    const end = data?.subscription_end ? new Date(data.subscription_end) : null;
    const now = new Date();
    const isActive = data?.status === 'active' && end && end > now;

    if (badge) {
        badge.textContent = isActive ? 'Активна' : 'Не активна';
        badge.classList.toggle('inactive', !isActive);
    }

    if (endDate) {
        endDate.textContent = end ? end.toLocaleDateString('ru-RU') : '—';
    }

    if (accessStatus) {
        accessStatus.textContent = isActive
            ? `Доступ открыт до ${end ? end.toLocaleDateString('ru-RU') : ''}`
            : 'Подписка не активна';
    }

    if (accessActionBtn) {
        accessActionBtn.textContent = isActive ? 'Войти в Reading Room' : 'Купить подписку';
        accessActionBtn.onclick = () => {
            if (isActive) {
                window.location.href = 'index.html#readingRoom';
            } else {
                const plansBlock = document.querySelector('.plans-grid');
                if (plansBlock) {
                    plansBlock.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };
    }

    const extendBtn = document.getElementById('extendBtn');
    const cancelAutoBtn = document.getElementById('cancelAutoBtn');
    const changeCardBtn = document.getElementById('changeCardBtn');
    const planMonthBtn = document.getElementById('planMonthBtn');
    const planYearBtn = document.getElementById('planYearBtn');

    const placeholderAction = () => alert('Функционал оплаты будет добавлен позже');

    if (extendBtn) extendBtn.onclick = placeholderAction;
    if (cancelAutoBtn) cancelAutoBtn.onclick = () => alert('Отмена автообновления будет добавлена позже');
    if (changeCardBtn) changeCardBtn.onclick = () => alert('Смена карты будет добавлена позже');
    if (planMonthBtn) planMonthBtn.onclick = placeholderAction;
    if (planYearBtn) planYearBtn.onclick = placeholderAction;

    if (historyList && historySection) {
        historyList.innerHTML = '';
        const history = Array.isArray(data?.history) ? data.history : [];
        if (!history.length) {
            historySection.style.display = 'none';
        } else {
            historySection.style.display = 'block';
            history.forEach(item => {
                const row = document.createElement('div');
                row.className = 'history-item';
                const dateValue = item.completed_at || item.created_at || item.date;
                const dt = dateValue ? new Date(dateValue) : null;
                const statusClass = item.status === 'failed' ? 'failed' : (item.status === 'pending' ? 'pending' : '');
                row.innerHTML = `
                    <span class="history-date">${dt ? dt.toLocaleDateString('ru-RU') : '—'}</span>
                    <span class="history-amount">${item.amount ? `${item.amount} ₽` : '—'}</span>
                    <span class="history-status ${statusClass}">${item.status || '—'}</span>
                `;
                historyList.appendChild(row);
            });
        }
    }
}

// Purchase Subscription
function showPurchaseScreen() {
    showScreen('purchaseScreen');
    document.getElementById('paymentWidget').classList.add('hidden');
    document.getElementById('purchaseContent').style.display = 'block';
}

async function selectPlan(days) {
    if (!userId) {
        alert('Ошибка: Не удалось получить ID пользователя. Пожалуйста, откройте приложение из Telegram.');
        return;
    }

    try {
        const planButtons = document.querySelectorAll('.plan-btn');
        planButtons.forEach(btn => btn.disabled = true);
        
        const amount = 299;
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

        if (data.payment_url) {
            alert(`Платёжная сессия создана!\n\nPayment ID: ${data.payment_id}\nСумма: ${data.amount}₽\nДней: ${data.days}\n\nПримечание: Интеграция T-Bank в тестовом режиме.`);
            
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
        }
    } catch (error) {
        console.error('Payment error details:', error);
        alert('Ошибка: ' + error.message + '\n\nПроверьте консоль браузера (F12) для деталей.');
    } finally {
        const planButtons = document.querySelectorAll('.plan-btn');
        planButtons.forEach(btn => btn.disabled = false);
    }
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

// Open support chat
async function openSupportChat(event) {
    if (event) {
        event.preventDefault();
    }
    
    try {
        // Get bot username from API
        const response = await fetch(`${API_BASE_URL}/support/bot-username`);
        const data = await response.json();
        const botUsername = data.username || 'bookflix_support_bot';
        
        // Use deeplink to open chat with bot
        const deeplink = `https://t.me/${botUsername}`;
        
        // Use Telegram WebApp method if available
        if (tg && tg.openLink) {
            tg.openLink(deeplink);
        } else {
            window.open(deeplink, '_blank');
        }
    } catch (error) {
        console.error('Error opening support chat:', error);
        // Fallback: try to open with default bot username
        const fallbackLink = 'https://t.me/bookflix_support_bot';
        if (tg && tg.openLink) {
            tg.openLink(fallbackLink);
        } else {
            window.open(fallbackLink, '_blank');
        }
    }
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

