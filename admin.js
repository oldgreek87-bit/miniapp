// API Base URL
const API_BASE_URL = window.location.origin + '/api';

// Get admin token
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

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'content') {
        loadCurrentContent();
    } else if (tabName === 'chats') {
        loadConversations();
    }
}

// Load current book and magazine
async function loadCurrentContent() {
    try {
        // Load current book
        const bookResponse = await fetch(`${API_BASE_URL}/book-of-month`);
        const book = await bookResponse.json();
        
        if (book) {
            document.getElementById('bookMonth').value = book.month;
            document.getElementById('bookYear').value = book.year;
            document.getElementById('bookTitle').value = book.title;
            document.getElementById('bookTitleEn').value = book.title_en || book.title || '';
            document.getElementById('bookAuthor').value = book.author;
            document.getElementById('bookPages').value = book.pages || '';
            document.getElementById('bookPublishedAt').value = book.published_at ? book.published_at.split('T')[0] : '';
            document.getElementById('bookDescription').value = book.description;
            document.getElementById('bookImageUrl').value = book.image_url || book.cover_url || '';
            document.getElementById('bookCoverUrl').value = book.cover_url || '';
        }

        // Load current magazine
        const magazineResponse = await fetch(`${API_BASE_URL}/magazine/latest`);
        const magazine = await magazineResponse.json();
        
        if (magazine) {
            document.getElementById('magazineIssue').value = magazine.issue_number;
            document.getElementById('magazineTitle').value = magazine.title;
            document.getElementById('magazineShortDescription').value = magazine.short_description;
            document.getElementById('magazineFullDescription').value = magazine.full_description;
            document.getElementById('magazineImageUrl').value = magazine.image_url || '';
        }
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Save book
async function saveBook(event) {
    event.preventDefault();
    
    const bookData = {
        month: parseInt(document.getElementById('bookMonth').value),
        year: parseInt(document.getElementById('bookYear').value),
        title: document.getElementById('bookTitle').value,
        title_en: document.getElementById('bookTitleEn').value,
        author: document.getElementById('bookAuthor').value,
        pages: parseInt(document.getElementById('bookPages').value),
        published_at: document.getElementById('bookPublishedAt').value,
        description: document.getElementById('bookDescription').value,
        image_url: document.getElementById('bookImageUrl').value || null,
        cover_url: document.getElementById('bookCoverUrl').value || null
    };

    if (!bookData.title_en || !bookData.published_at || !bookData.pages || Number.isNaN(bookData.pages)) {
        showError('Заполните все поля: EN название, дата, страницы.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/book-of-month`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                ...bookData,
                admin_token: ADMIN_TOKEN
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Не удалось сохранить книгу');
        }

        showSuccess('Книга успешно сохранена!');
    } catch (error) {
        showError('Ошибка: ' + error.message);
    }
}

// Save magazine
async function saveMagazine(event) {
    event.preventDefault();
    
    const magazineData = {
        issue_number: parseInt(document.getElementById('magazineIssue').value),
        title: document.getElementById('magazineTitle').value,
        short_description: document.getElementById('magazineShortDescription').value,
        full_description: document.getElementById('magazineFullDescription').value,
        image_url: document.getElementById('magazineImageUrl').value || null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/magazine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                ...magazineData,
                admin_token: ADMIN_TOKEN
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Не удалось сохранить журнал');
        }

        showSuccess('Журнал успешно сохранён!');
    } catch (error) {
        showError('Ошибка: ' + error.message);
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users?admin_token=${ADMIN_TOKEN}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось загрузить пользователей');
        }
        
        renderUsers(data.users);
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
                                    ${user.username ? `<div style="color: #999; font-size: 12px;">@${user.username}</div>` : ''}
                                    <div style="color: #999; font-size: 12px;">ID: ${user.user_id}</div>
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
                            <button class="btn" onclick="addDaysToUser(${user.user_id})">Добавить дни</button>
                        </td>
                    </tr>
                `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

async function addDaysToUser(userId) {
    const days = prompt('Введите количество дней:');
    if (!days || isNaN(days) || parseInt(days) < 1) {
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
                user_id: userId,
                days: parseInt(days),
                admin_token: ADMIN_TOKEN
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Не удалось добавить дни');
        }

        alert('Дни успешно добавлены!');
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

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Load conversations
async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/conversations?admin_token=${ADMIN_TOKEN}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось загрузить чаты');
        }
        
        renderConversations(data.conversations);
    } catch (error) {
        showError(error.message);
        document.getElementById('chatsContainer').innerHTML = `
            <div class="error">Ошибка загрузки чатов: ${error.message}</div>
        `;
    }
}

function renderConversations(conversations) {
    const container = document.getElementById('chatsContainer');
    
    if (conversations.length === 0) {
        container.innerHTML = '<div class="loading">Чаты не найдены</div>';
        return;
    }
    
    const list = conversations.map(conv => {
        const userName = conv.first_name && conv.last_name 
            ? `${conv.first_name} ${conv.last_name}` 
            : (conv.first_name || conv.username || `Пользователь ${conv.user_id}`);
        
        const lastMessagePreview = conv.last_message 
            ? (conv.last_message.length > 50 ? conv.last_message.substring(0, 50) + '...' : conv.last_message)
            : 'Нет сообщений';
        
        const lastMessageDate = conv.last_message_at 
            ? new Date(conv.last_message_at).toLocaleString('ru-RU')
            : 'Н/Д';
        
        return `
            <div class="conversation-item" onclick="openConversation(${conv.user_id})" style="
                background-color: #1a1a1a;
                border: 2px solid #333;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 15px;
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.borderColor='#666'" onmouseout="this.style.borderColor='#333'">
                <div style="display: flex; align-items: center; gap: 15px;">
                    ${conv.photo_url ? `<img src="${conv.photo_url}" alt="${userName}" class="user-avatar" onerror="this.style.display='none'">` : '<div class="user-avatar"></div>'}
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${userName}</div>
                        ${conv.username ? `<div style="color: #999; font-size: 12px; margin-bottom: 5px;">@${conv.username}</div>` : ''}
                        <div style="color: #ccc; font-size: 14px; margin-bottom: 5px;">${lastMessagePreview}</div>
                        <div style="color: #666; font-size: 12px;">${lastMessageDate}</div>
                    </div>
                    ${conv.unread_count > 0 ? `<div style="background: #0066ff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${conv.unread_count}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = list;
}

let currentConversationUserId = null;

async function openConversation(userId) {
    currentConversationUserId = userId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/conversation?user_id=${userId}&admin_token=${ADMIN_TOKEN}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось загрузить диалог');
        }
        
        renderConversation(data);
    } catch (error) {
        showError(error.message);
    }
}

function renderConversation(conversation) {
    const userName = conversation.user_info?.first_name && conversation.user_info?.last_name
        ? `${conversation.user_info.first_name} ${conversation.user_info.last_name}`
        : (conversation.user_info?.first_name || conversation.user_info?.username || `Пользователь ${conversation.user_id}`);
    
    const messagesHtml = conversation.messages.map(msg => `
        <div style="
            margin-bottom: 15px;
            padding: 12px;
            border-radius: 8px;
            background-color: ${msg.is_from_user ? '#1a1a1a' : '#0066ff'};
            color: ${msg.is_from_user ? '#fff' : '#fff'};
            max-width: 80%;
            ${msg.is_from_user ? 'margin-left: 0;' : 'margin-left: auto;'}
        ">
            <div style="font-size: 14px; line-height: 1.5;">${escapeHtml(msg.message_text)}</div>
            <div style="font-size: 11px; color: ${msg.is_from_user ? '#999' : '#ccc'}; margin-top: 5px;">
                ${new Date(msg.created_at).toLocaleString('ru-RU')}
            </div>
        </div>
    `).join('');
    
    const container = document.getElementById('chatsContainer');
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn" onclick="loadConversations()" style="margin-bottom: 15px;">← Назад к списку</button>
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background-color: #1a1a1a; border-radius: 8px;">
                ${conversation.user_info?.photo_url ? `<img src="${conversation.user_info.photo_url}" alt="${userName}" class="user-avatar" onerror="this.style.display='none'">` : '<div class="user-avatar"></div>'}
                <div>
                    <div style="font-weight: 600; font-size: 16px;">${userName}</div>
                    ${conversation.user_info?.username ? `<div style="color: #999; font-size: 12px;">@${conversation.user_info.username}</div>` : ''}
                </div>
            </div>
        </div>
        <div style="
            background-color: #1a1a1a;
            border: 2px solid #333;
            border-radius: 12px;
            padding: 20px;
            max-height: 500px;
            overflow-y: auto;
            margin-bottom: 20px;
        ">
            ${messagesHtml || '<div class="loading">Нет сообщений</div>'}
        </div>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="replyMessageInput" placeholder="Введите ответ..." style="
                flex: 1;
                background-color: #000000;
                color: #ffffff;
                border: 2px solid #ffffff;
                padding: 12px;
                border-radius: 8px;
                font-size: 16px;
                font-family: inherit;
            " onkeypress="if(event.key === 'Enter') sendReply()">
            <button class="btn btn-primary" onclick="sendReply()">Отправить</button>
        </div>
    `;
}

async function sendReply() {
    const input = document.getElementById('replyMessageInput');
    const messageText = input.value.trim();
    
    if (!messageText || !currentConversationUserId) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/send-reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                user_id: currentConversationUserId,
                message_text: messageText,
                admin_token: ADMIN_TOKEN
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось отправить сообщение');
        }
        
        input.value = '';
        showSuccess('Сообщение отправлено!');
        
        // Reload conversation
        await openConversation(currentConversationUserId);
    } catch (error) {
        showError('Ошибка: ' + error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load content on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentContent();
});

