// Subscription page logic (isolated from main screen)
(() => {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    const userId = user?.id;
    const API_BASE_URL = window.location.origin + '/api';

    document.addEventListener('DOMContentLoaded', () => {
        setAvatar(user?.photo_url);
        setName(user);
        loadSubscription();
    });

    function setAvatar(photoUrl) {
        const avatarEl = document.getElementById('subscriptionAvatar');
        if (!avatarEl) return;
        if (photoUrl) {
            avatarEl.style.backgroundImage = `url(${photoUrl})`;
        } else {
            avatarEl.style.backgroundImage = '';
        }
    }

    function setName(user) {
        const nameEl = document.getElementById('subscriptionName');
        if (!nameEl) return;
        const fn = user?.first_name || '';
        const ln = user?.last_name ? ` ${user.last_name}` : '';
        const uname = user?.username ? `@${user.username}` : '';
        const label = (fn + ln).trim() || uname || 'Гость';
        nameEl.textContent = label;
    }

    async function loadSubscription() {
        showStatusSkeleton(true);
        const fallback = {
            status: 'inactive',
            subscription_end: null,
            history: []
        };

        try {
            const res = await fetch(`${API_BASE_URL}/subscription-status?user_id=${userId}`);
            if (!res.ok) throw new Error('fail');
            const data = await res.json();
            renderSubscription(data || fallback);
        } catch (e) {
            renderSubscription(fallback);
        } finally {
            showStatusSkeleton(false);
        }
    }

    function renderSubscription(data) {
        const end = data?.subscription_end ? new Date(data.subscription_end) : null;
        const now = new Date();
        const isActive = data?.status === 'active' && end && end > now;

        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        const heroBtn = document.getElementById('heroActionBtn');
        const statusHero = document.getElementById('statusHero');

        if (heroTitle) heroTitle.textContent = isActive ? 'Подписка активна' : 'Подписка не активна';
        if (heroSubtitle) heroSubtitle.textContent = isActive
            ? `Доступ открыт до ${end ? end.toLocaleDateString('ru-RU') : ''}`
            : 'Доступ в Reading Room закрыт';
        if (heroBtn) {
            heroBtn.textContent = isActive ? 'Войти в Reading Room' : 'Купить подписку';
            heroBtn.onclick = () => {
                if (isActive) {
                    window.location.href = 'index.html#readingRoom';
                } else {
                    const plansBlock = document.querySelector('.plans-grid');
                    if (plansBlock) plansBlock.scrollIntoView({ behavior: 'smooth' });
                }
            };
        }
        if (statusHero) {
            statusHero.classList.toggle('hero-active', isActive);
        }

        const manageSection = document.getElementById('manageSection');
        const manageStatus = document.getElementById('manageStatus');
        const manageEndDate = document.getElementById('manageEndDate');
        const badge = document.getElementById('subStatusBadge');

        if (manageSection) manageSection.style.display = isActive ? 'block' : 'none';
        if (manageStatus) manageStatus.textContent = isActive ? 'Подписка активна' : 'Подписка не активна';
        if (manageEndDate) manageEndDate.textContent = isActive && end ? `Доступ до ${end.toLocaleDateString('ru-RU')}` : '—';
        if (badge) {
            badge.textContent = isActive ? 'Активна' : 'Не активна';
            badge.classList.toggle('inactive', !isActive);
            badge.classList.toggle('active', isActive);
        }

        hookButtons();
        renderHistory(isActive, data?.history);
    }

    function hookButtons() {
        const placeholder = () => alert('Функционал оплаты будет добавлен позже');
        const extendBtn = document.getElementById('extendBtn');
        const cancelAutoBtn = document.getElementById('cancelAutoBtn');
        const changeCardBtn = document.getElementById('changeCardBtn');
        const planMonthBtn = document.getElementById('planMonthBtn');
        const planYearBtn = document.getElementById('planYearBtn');

        if (extendBtn) extendBtn.onclick = placeholder;
        if (cancelAutoBtn) cancelAutoBtn.onclick = () => alert('Отмена автообновления будет добавлена позже');
        if (changeCardBtn) changeCardBtn.onclick = () => alert('Смена карты будет добавлена позже');
        if (planMonthBtn) planMonthBtn.onclick = placeholder;
        if (planYearBtn) planYearBtn.onclick = placeholder;
    }

    function renderHistory(isActive, history) {
        const accordion = document.getElementById('historyAccordion');
        const list = document.getElementById('historyList');
        if (!accordion || !list) return;

        const items = Array.isArray(history) ? history : [];
        if (!isActive || items.length === 0) {
            accordion.style.display = 'none';
            return;
        }

        accordion.style.display = 'block';
        list.innerHTML = '';
        items.forEach(item => {
            const dateValue = item.completed_at || item.created_at || item.date;
            const dt = dateValue ? new Date(dateValue) : null;
            const statusClass = item.status === 'failed' ? 'failed' : (item.status === 'pending' ? 'pending' : 'success');

            const row = document.createElement('div');
            row.className = 'history-item';
            row.innerHTML = `
                <span class="history-date">${dt ? dt.toLocaleDateString('ru-RU') : '—'}</span>
                <span class="history-amount">${item.amount ? `${item.amount} ₽` : '—'}</span>
                <span class="history-status ${statusClass}">${item.status || '—'}</span>
            `;
            list.appendChild(row);
        });
    }

    function showStatusSkeleton(show) {
        const sk = document.getElementById('statusSkeleton');
        const hero = document.getElementById('statusHero');
        if (sk) sk.style.display = show ? 'block' : 'none';
        if (hero) hero.style.display = show ? 'none' : 'flex';
    }
})();

