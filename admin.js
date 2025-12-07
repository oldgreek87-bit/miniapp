// API Base URL - Uses same origin as admin panel
const API_BASE_URL = window.location.origin + '/api';

// Get admin token from URL or prompt
function getAdminToken() {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');
    
    if (!token) {
        token = localStorage.getItem('admin_token');
    }
    
    if (!token) {
        token = prompt('Введите админ токен:');
        if (token) {
            localStorage.setItem('admin_token', token);
        }
    }
    
    return token;
}

const ADMIN_TOKEN = getAdminToken();
let currentUserId = null;
let currentChatUserId = null;
let allUsers = [];
let chatInterval = null;

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    
    // Setup search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterUsers(e.target.value);
    });
});

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users?admin_token=${ADMIN_TOKEN}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось загрузить пользователей');
        }
        
        allUsers = data.users;
        renderUsers(allUsers);
    } catch (error) {
        showError(error.message);
        document.getElementById('usersContainer').innerHTML = `
            <div class="error">Ошибка загрузки пользователей: ${error.message}</div>
        `;
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersContainer');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="loading">Пользователи не найдены</div>';
        return;
    }
    
    const table = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Пользователь</th>
                    <th>Статус</th>
                    <th>Дата начала</th>
                    <th>Дата окончания</th>
                    <th>Осталось дней</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => {
                    const userName = user.first_name || user.username || `ID: ${user.user_id}`;
                    const userDisplay = user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : (user.first_name || user.username || `Пользователь ${user.user_id}`);
                    
                    return `
                    <tr>
                        <td>
                            <div class="user-info">
                                ${user.userpic ? `<img src="${user.userpic}" alt="${userName}" class="user-avatar" onerror="this.style.display='none'">` : '<div class="user-avatar"></div>'}
                                <div>
                                    <div class="user-name">${userDisplay}</div>
                                    ${user.username ? `<div class="user-id">@${user.username}</div>` : ''}
                                    <div class="user-id">ID: ${user.user_id}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="status-badge status-${user.status}">
                                ${user.status === 'active' ? 'Активна' : user.status === 'cancelled' ? 'Отменена' : 'Неактивна'}
                            </span>
                        </td>
                        <td>${user.subscription_start ? new Date(user.subscription_start).toLocaleDateString('ru-RU') : 'Н/Д'}</td>
                        <td>${user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('ru-RU') : 'Н/Д'}</td>
                        <td>${user.days_remaining}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-chat" onclick="openChatModal(${user.user_id}, '${userDisplay.replace(/'/g, "\\'")}')">Чат</button>
                                <button class="btn" onclick="openAddDaysModal(${user.user_id})">Добавить дни</button>
                                <button class="btn" onclick="openSetSubscriptionModal(${user.user_id})">Изменить статус</button>
                            </div>
                        </td>
                    </tr>
                `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function filterUsers(searchTerm) {
    if (!searchTerm) {
        renderUsers(allUsers);
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = allUsers.filter(user => {
        const userName = (user.first_name || '').toLowerCase();
        const userLastName = (user.last_name || '').toLowerCase();
        const username = (user.username || '').toLowerCase();
        const userId = user.user_id.toString();
        
        return userName.includes(term) || 
               userLastName.includes(term) || 
               username.includes(term) || 
               userId.includes(term);
    });
    
    renderUsers(filtered);
}

function openAddDaysModal(userId) {
    currentUserId = userId;
    document.getElementById('daysInput').value = '';
    document.getElementById('addDaysModal').classList.add('active');
}

function openSetSubscriptionModal(userId) {
    currentUserId = userId;
    const user = allUsers.find(u => u.user_id === userId);
    if (user) {
        document.getElementById('statusSelect').value = user.status;
        if (user.subscription_end) {
            const date = new Date(user.subscription_end);
            document.getElementById('endDateInput').value = date.toISOString().split('T')[0];
        } else {
            document.getElementById('endDateInput').value = '';
        }
    }
    document.getElementById('setSubscriptionModal').classList.add('active');
}

function openChatModal(userId, userName) {
    currentChatUserId = userId;
    document.getElementById('chatUserName').textContent = `Чат с ${userName}`;
    document.getElementById('chatModal').classList.add('active');
    loadChatMessages();
    
    // Auto-refresh chat every 3 seconds
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadChatMessages, 3000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    currentUserId = null;
    
    if (modalId === 'chatModal') {
        currentChatUserId = null;
        if (chatInterval) {
            clearInterval(chatInterval);
            chatInterval = null;
        }
    }
}

async function loadChatMessages() {
    if (!currentChatUserId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/messages?user_id=${currentChatUserId}&admin_token=${ADMIN_TOKEN}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось загрузить сообщения');
        }
        
        renderChatMessages(data.messages || []);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function renderChatMessages(messages) {
    const container = document.getElementById('chatContainer');
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="loading">Нет сообщений</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const date = new Date(msg.created_at);
        const timeStr = date.toLocaleString('ru-RU');
        const isUser = msg.is_from_user === 1;
        
        return `
            <div class="chat-message ${isUser ? 'user' : 'admin'}">
                <div>${escapeHtml(msg.message_text)}</div>
                <div class="chat-message-time">${timeStr}</div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const messageText = document.getElementById('chatMessageInput').value.trim();
    
    if (!messageText || !currentChatUserId) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                user_id: currentChatUserId,
                message_text: messageText,
                admin_token: ADMIN_TOKEN
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось отправить сообщение');
        }
        
        // Clear input
        document.getElementById('chatMessageInput').value = '';
        
        // Reload messages
        loadChatMessages();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function confirmAddDays() {
    const days = parseInt(document.getElementById('daysInput').value);
    
    if (!days || days < 1) {
        alert('Пожалуйста, введите корректное количество дней');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/add-days`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                user_id: currentUserId,
                days: days,
                admin_token: ADMIN_TOKEN
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось добавить дни');
        }
        
        alert('Дни успешно добавлены!');
        closeModal('addDaysModal');
        loadUsers();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function confirmSetSubscription() {
    const status = document.getElementById('statusSelect').value;
    const endDate = document.getElementById('endDateInput').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/set-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                user_id: currentUserId,
                status: status,
                end_date: endDate || null,
                admin_token: ADMIN_TOKEN
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось изменить подписку');
        }
        
        alert('Подписка успешно обновлена!');
        closeModal('setSubscriptionModal');
        loadUsers();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Allow sending message with Enter key
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatMessageInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});
