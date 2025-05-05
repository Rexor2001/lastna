// admin.js
const API_BASE_URL = 'http://localhost:3001';
const adminPanel = document.getElementById('admin-panel');
const logoutLink = document.getElementById('logout-link');

let currentUser = null;
let isAdmin = false;

logoutLink.addEventListener('click', logout);

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    if (!isAdmin) {
        window.location.href = '/';
        return;
    }
    showAdminPanel();
});

async function loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            isAdmin = userData.isAdmin;
        } else {
            logout();
        }
    } catch (error) {
        logout();
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// --- Admin Panel UI Redesign (reuse logic from app.js, but scoped for admin.js) ---
// (Copy the renderAdminPanel, displayUsers, showAddUserModal, showEditUserModal, showAdminModal, closeAdminModal, displayBooksAdmin, showAddBookModal, showEditBookModal, loadBooksAdmin, deleteBookAdmin, loadUsers, deleteUser, loadPendingBooks, displayPendingBooks, approveBook from the previous admin panel logic)

// For brevity, you can copy the admin panel logic from the previous app.js changes here, adjusting DOM selectors as needed. 

function showAdminPanel() {
    renderAdminPanel();
    loadUsers();
    loadBooksAdmin();
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        const usersList = document.getElementById('users-list');
        if (usersList) usersList.innerHTML = '<tr><td colspan="4">Error loading users.</td></tr>';
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('users-list');
    if (!users || users.length === 0) {
        usersList.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
        return;
    }
    usersList.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.isAdmin ? 'Yes' : 'No'}</td>
            <td>
                <button class="edit-btn" onclick="showEditUserModal('${user._id}')">Edit</button>
                <button class="delete-btn" onclick="deleteUser('${user._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.ok) {
            loadUsers();
        } else {
            alert('Error deleting user.');
        }
    } catch (error) {
        alert('Error deleting user.');
    }
}

function renderAdminPanel() {
    adminPanel.innerHTML = `
        <h2>Admin Panel</h2>
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="users">Users</button>
            <button class="tab-btn" data-tab="books">Books</button>
        </div>
        <div id="users-tab" class="tab-content">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Users</h3>
                <button id="add-user-btn">Add User</button>
            </div>
            <table class="admin-table" id="users-table">
                <thead><tr><th>Username</th><th>Email</th><th>Admin</th><th>Actions</th></tr></thead>
                <tbody id="users-list"></tbody>
            </table>
        </div>
        <div id="books-tab" class="tab-content" style="display:none;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Books</h3>
                <button id="add-book-btn">Add Book</button>
            </div>
            <table class="admin-table" id="books-table">
                <thead><tr><th>Title</th><th>Author</th><th>Uploader</th><th>Actions</th></tr></thead>
                <tbody id="books-list"></tbody>
            </table>
        </div>
        <div id="admin-modal" class="modal" style="display:none;"></div>
    `;
    // Tab switching
    adminPanel.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            adminPanel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            adminPanel.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            adminPanel.querySelector(`#${btn.dataset.tab}-tab`).style.display = 'block';
        });
    });
    // Add user/book button events
    adminPanel.querySelector('#add-user-btn').onclick = showAddUserModal;
    adminPanel.querySelector('#add-book-btn').onclick = showAddBookModal;
}

function showAddUserModal() {
    showAdminModal(`
        <h3>Add User</h3>
        <form id="add-user-form">
            <input type="text" placeholder="Username" required><br>
            <input type="email" placeholder="Email" required><br>
            <input type="password" placeholder="Password" required><br>
            <label><input type="checkbox" id="is-admin"> Admin</label><br>
            <button type="submit">Add</button>
            <button type="button" onclick="closeAdminModal()">Cancel</button>
        </form>
    `);
    document.getElementById('add-user-form').onsubmit = async function(e) {
        e.preventDefault();
        const username = e.target[0].value;
        const email = e.target[1].value;
        const password = e.target[2].value;
        const isAdmin = e.target[3].checked;
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ username, email, password, isAdmin })
            });
            if (response.ok) {
                closeAdminModal();
                loadUsers();
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            alert('Error adding user.');
        }
    };
}

function showEditUserModal(userId) {
    // Fetch user data and show modal
    fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(users => {
        const user = users.find(u => u._id === userId);
        if (!user) return alert('User not found.');
        showAdminModal(`
            <h3>Edit User</h3>
            <form id="edit-user-form">
                <input type="text" name="username" value="${user.username}" required><br>
                <input type="email" name="email" value="${user.email}" required><br>
                <input type="password" name="password" placeholder="New password (leave blank to keep current)"><br>
                <label><input type="checkbox" name="isAdmin" ${user.isAdmin ? 'checked' : ''}> Admin</label><br>
                <button type="submit">Save</button>
                <button type="button" onclick="closeAdminModal()">Cancel</button>
            </form>
        `);
        document.getElementById('edit-user-form').onsubmit = async function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const username = formData.get('username');
            const email = formData.get('email');
            const password = formData.get('password');
            const isAdmin = formData.get('isAdmin') === 'on';
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ username, email, isAdmin, password })
                });
                if (response.ok) {
                    closeAdminModal();
                    loadUsers();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Error updating user.');
                }
            } catch {
                alert('Error updating user.');
            }
        };
    });
}

function showAdminModal(content) {
    const modal = document.getElementById('admin-modal');
    modal.innerHTML = `<div class="modal-content">${content}</div>`;
    modal.style.display = 'block';
    modal.onclick = function(e) { if (e.target === modal) closeAdminModal(); };
}
function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.style.display = 'none';
}

function displayBooksAdmin(books) {
    const booksList = document.getElementById('books-list');
    if (!books || books.length === 0) {
        booksList.innerHTML = '<tr><td colspan="5">No books found.</td></tr>';
        return;
    }
    booksList.innerHTML = books.map(book => `
        <tr>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.uploadedBy ? (book.uploadedBy.username || book.uploadedBy) : ''}</td>
            <td>
                <button class="edit-btn" onclick="showEditBookModal('${book._id}')">Edit</button>
                <button class="delete-btn" onclick="deleteBookAdmin('${book._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddBookModal() {
    showAdminModal(`
        <h3>Add Book</h3>
        <form id="add-book-form">
            <input type="text" name="title" placeholder="Title" required><br>
            <input type="text" name="author" placeholder="Author" required><br>
            <textarea name="description" placeholder="Description" required></textarea><br>
            <input type="file" name="book" accept=".pdf,.doc,.docx,.epub" required><br>
            <button type="submit">Add</button>
            <button type="button" onclick="closeAdminModal()">Cancel</button>
        </form>
    `);
    document.getElementById('add-book-form').onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            const response = await fetch(`${API_BASE_URL}/api/books/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            if (response.ok) {
                closeAdminModal();
                loadBooksAdmin();
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            alert('Error adding book.');
        }
    };
}

function showEditBookModal(bookId) {
    // Fetch book data and show modal
    fetch(`${API_BASE_URL}/api/admin/all-books`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(books => {
        const book = books.find(b => b._id === bookId);
        if (!book) return alert('Book not found.');
        showAdminModal(`
            <h3>Edit Book</h3>
            <form id="edit-book-form">
                <input type="text" name="title" value="${book.title}" required><br>
                <input type="text" name="author" value="${book.author}" required><br>
                <textarea name="description" required>${book.description}</textarea><br>
                <button type="submit">Save</button>
                <button type="button" onclick="closeAdminModal()">Cancel</button>
            </form>
        `);
        document.getElementById('edit-book-form').onsubmit = async function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const title = formData.get('title');
            const author = formData.get('author');
            const description = formData.get('description');
            try {
                const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title, author, description })
                });
                if (response.ok) {
                    closeAdminModal();
                    loadBooksAdmin();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Error updating book.');
                }
            } catch {
                alert('Error updating book.');
            }
        };
    });
}

async function loadBooksAdmin() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/all-books`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load books');
        const books = await response.json();
        displayBooksAdmin(books);
    } catch (error) {
        alert('Error loading books.');
    }
}

async function deleteBookAdmin(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            loadBooksAdmin();
        } else if (response.status === 404) {
            alert('Book not found or already deleted.');
            loadBooksAdmin();
        } else {
            alert('Error deleting book.');
        }
    } catch (error) {
        alert('Error deleting book.');
    }
} 