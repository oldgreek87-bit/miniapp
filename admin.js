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
            document.getElementById('bookAuthor').value = book.author;
            document.getElementById('bookDescription').value = book.description;
            document.getElementById('bookImageUrl').value = book.image_url || '';
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
        author: document.getElementById('bookAuthor').value,
        description: document.getElementById('bookDescription').value,
        image_url: document.getElementById('bookImageUrl').value || null
    };

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

// Load content on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentContent();
});

