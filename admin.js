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
        token = prompt('Enter admin token:');
        if (token) {
            localStorage.setItem('admin_token', token);
        }
    }
    
    return token;
}

const ADMIN_TOKEN = getAdminToken();
let currentUserId = null;
let allUsers = [];

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
            throw new Error(data.error || 'Failed to load users');
        }
        
        allUsers = data.users;
        renderUsers(allUsers);
    } catch (error) {
        showError(error.message);
        document.getElementById('usersContainer').innerHTML = `
            <div class="error">Error loading users: ${error.message}</div>
        `;
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersContainer');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="loading">No users found</div>';
        return;
    }
    
    const table = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days Remaining</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.user_id}</td>
                        <td>
                            <span class="status-badge status-${user.status}">
                                ${user.status}
                            </span>
                        </td>
                        <td>${user.subscription_start ? new Date(user.subscription_start).toLocaleDateString() : 'N/A'}</td>
                        <td>${user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : 'N/A'}</td>
                        <td>${user.days_remaining}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn" onclick="openAddDaysModal(${user.user_id})">Add Days</button>
                                <button class="btn" onclick="openSetSubscriptionModal(${user.user_id})">Set Status</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
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
    
    const filtered = allUsers.filter(user => {
        const term = searchTerm.toLowerCase();
        return user.user_id.toString().includes(term);
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

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    currentUserId = null;
}

async function confirmAddDays() {
    const days = parseInt(document.getElementById('daysInput').value);
    
    if (!days || days < 1) {
        alert('Please enter a valid number of days');
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
            throw new Error(data.error || 'Failed to add days');
        }
        
        alert('Days added successfully!');
        closeModal('addDaysModal');
        loadUsers();
    } catch (error) {
        alert('Error: ' + error.message);
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
            throw new Error(data.error || 'Failed to set subscription');
        }
        
        alert('Subscription updated successfully!');
        closeModal('setSubscriptionModal');
        loadUsers();
    } catch (error) {
        alert('Error: ' + error.message);
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

