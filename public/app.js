// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const bookList = document.getElementById('book-list');
const uploadForm = document.getElementById('upload-form');
const adminPanel = document.getElementById('admin-panel');
const booksContainer = document.getElementById('books-container');
const usersList = document.getElementById('users-list');
const pendingBooksList = document.getElementById('pending-books-list');

// API Base URL
const API_BASE_URL = 'http://localhost:3001';

// Navigation Links
const loginLink = document.getElementById('login-link');
const registerLink = document.getElementById('register-link');
const uploadLink = document.getElementById('upload-link');
const myBooksLink = document.getElementById('my-books-link');
const adminLink = document.getElementById('admin-link');
const logoutLink = document.getElementById('logout-link');
const homeLink = document.getElementById('home-link');

// State
let currentUser = null;
let isAdmin = false;

// Event Listeners
loginLink.addEventListener('click', showLoginForm);
registerLink.addEventListener('click', showRegisterForm);
uploadLink.addEventListener('click', showUploadForm);
myBooksLink.addEventListener('click', showMyBooks);
adminLink.addEventListener('click', showAdminPanel);
logoutLink.addEventListener('click', logout);
homeLink.addEventListener('click', showBookList);

// Form Submissions
document.getElementById('login').addEventListener('submit', handleLogin);
document.getElementById('register').addEventListener('submit', handleRegister);
document.getElementById('upload').addEventListener('submit', handleUpload);

// Tab Buttons
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`${btn.dataset.tab}-tab`).style.display = 'block';
    });
});

// Functions
function showLoginForm() {
    hideAll();
    loginForm.style.display = 'block';
}

function showRegisterForm() {
    hideAll();
    registerForm.style.display = 'block';
}

function showBookList() {
    hideAll();
    document.getElementById('welcome-banner').style.display = 'block';
    // Only show recent books for admin
    if (isAdmin) {
        document.getElementById('recent-books-section').style.display = 'block';
        loadRecentBooks();
    } else {
        document.getElementById('recent-books-section').style.display = 'none';
    }
    bookList.style.display = 'block';
    loadBooks();
}

function showUploadForm() {
    hideAll();
    uploadForm.style.display = 'block';
}

function showMyBooks() {
    hideAll();
    bookList.style.display = 'block';
    loadMyBooks();
}

function showAdminPanel() {
    hideAll();
    renderAdminPanel();
    loadUsers();
    loadBooksAdmin();
    loadPendingBooks();
}

function hideAll() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    bookList.style.display = 'none';
    uploadForm.style.display = 'none';
    adminPanel.style.display = 'none';
    if (document.getElementById('welcome-banner')) document.getElementById('welcome-banner').style.display = 'none';
    if (document.getElementById('recent-books-section')) document.getElementById('recent-books-section').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            await loadUserData();
            if (isAdmin) {
                showAdminPanel();
            } else {
            showBookList();
            }
        } else {
            console.error('Login failed:', data);
            alert(data.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error logging in. Please check if the server is running.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            await loadUserData();
            showBookList();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Error registering. Please check if the server is running.');
    }
}

async function handleUpload(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', e.target[0].value);
    formData.append('author', e.target[1].value);
    formData.append('description', e.target[2].value);
    formData.append('book', e.target[3].files[0]);

    try {
        const response = await fetch(`${API_BASE_URL}/api/books/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            alert('Book uploaded successfully');
            showBookList();
        } else {
            const data = await response.json();
            alert(data.message);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading book. Please check if the server is running.');
    }
}

async function loadBooks() {
    const token = localStorage.getItem('token');
    if (!token) {
        booksContainer.innerHTML = '<p class="error">Please log in to view your books.</p>';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/books`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const books = await response.json();
        await displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
        booksContainer.innerHTML = '<p class="error">Error loading books. Please check if you are logged in.</p>';
    }
}

async function loadMyBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/books/my-books`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const books = await response.json();
        await displayBooks(books);
    } catch (error) {
        console.error('Error loading my books:', error);
        booksContainer.innerHTML = '<p class="error">Error loading books. Please check if the server is running.</p>';
    }
}

function displayBooks(books) {
    if (!books || books.length === 0) {
        booksContainer.innerHTML = '<p>No books available.</p>';
        return;
    }
    booksContainer.innerHTML = books.map(book => `
        <div class="book-card">
            <h3>${book.title}</h3>
            <p>Author: ${book.author}</p>
            <p>${book.description}</p>
            <p>Type: ${book.fileType}</p>
            <p>Downloads: ${book.downloads}</p>
            <button onclick="downloadBook('${book._id}')">Download</button>
            ${currentUser && (book.uploadedBy === currentUser._id || isAdmin) ? 
                `<button class="delete-btn" onclick="deleteBook('${book._id}')">Delete</button>` : ''}
        </div>
    `).join('');
}

async function downloadBook(bookId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/books/download/${bookId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'book';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading book. Please check if the server is running.');
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            alert('Book deleted successfully');
            loadBooks();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting book. Please check if the server is running.');
    }
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
        usersList.innerHTML = '<p class="error">Error loading users. Please check if the server is running.</p>';
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
            alert('User deleted successfully');
            loadUsers();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Delete user error:', error);
        alert('Error deleting user. Please check if the server is running.');
    }
}

async function loadPendingBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/pending-books`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const books = await response.json();
        displayPendingBooks(books);
    } catch (error) {
        console.error('Error loading pending books:', error);
        pendingBooksList.innerHTML = '<p class="error">Error loading pending books. Please check if the server is running.</p>';
    }
}

function displayPendingBooks(books) {
    if (!books || books.length === 0) {
        pendingBooksList.innerHTML = '<p>No pending books found.</p>';
        return;
    }

    pendingBooksList.innerHTML = books.map(book => `
        <div class="pending-book-card">
            <h3>${book.title}</h3>
            <p>Author: ${book.author}</p>
            <p>Uploaded by: ${book.uploadedBy.username}</p>
            <button class="delete-btn" onclick="deleteBook('${book._id}')">Delete</button>
        </div>
    `).join('');
}

async function loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            isAdmin = userData.isAdmin;
            updateNavigation();
            if (isAdmin && window.location.hash !== '#admin') {
                showAdminPanel();
            }
        } else {
            logout();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        logout();
    }
}

function updateNavigation() {
    if (currentUser) {
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        uploadLink.style.display = 'inline';
        myBooksLink.style.display = 'inline';
        logoutLink.style.display = 'inline';
        if (isAdmin) {
            adminLink.style.display = 'inline';
        }
    } else {
        loginLink.style.display = 'inline';
        registerLink.style.display = 'inline';
        uploadLink.style.display = 'none';
        myBooksLink.style.display = 'none';
        adminLink.style.display = 'none';
        logoutLink.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    isAdmin = false;
    updateNavigation();
    showLoginForm();
}

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    if (!isAdmin) {
    showBookList();
    }
});

// --- Admin Panel UI Redesign ---

function renderAdminPanel() {
    adminPanel.innerHTML = `
        <h2>Admin Panel</h2>
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="users">Users</button>
            <button class="tab-btn" data-tab="books">Books</button>
            <button class="tab-btn" data-tab="pending-books">Pending Books</button>
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
        <div id="pending-books-tab" class="tab-content" style="display:none;">
            <h3>Pending Books</h3>
            <div id="pending-books-list"></div>
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

// --- User CRUD ---
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
    // Fetch user data and show modal (implementation needed)
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

// --- Book CRUD ---
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
            <input type="text" placeholder="Title" required><br>
            <input type="text" placeholder="Author" required><br>
            <textarea placeholder="Description" required></textarea><br>
            <input type="file" accept=".pdf,.doc,.docx,.epub" required><br>
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
    // Fetch book data and show modal (implementation needed)
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
        } else {
            alert('Error deleting book.');
        }
    } catch (error) {
        alert('Error deleting book.');
    }
}

function loadRecentBooks() {
    fetch(`${API_BASE_URL}/api/admin/all-books`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to fetch books');
        }
        return res.json();
    })
    .then(books => {
        if (!Array.isArray(books)) {
            throw new Error('Invalid response format');
        }
        // Show the 5 most recent approved books
        const approvedBooks = books.filter(b => b.isApproved !== false);
        const recent = approvedBooks.slice(0, 5);
        const list = document.getElementById('recent-books-list');
        if (!recent.length) {
            list.innerHTML = '<p>No recent books available.</p>';
            return;
        }
        list.innerHTML = recent.map(book => `
            <div class="recent-book-card">
                <strong>${book.title}</strong> by ${book.author}<br>
                <span style="font-size:0.9em; color:#666;">${book.description}</span><br>
                <button onclick="downloadBook('${book._id}')">Download</button>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error loading recent books:', error);
        const list = document.getElementById('recent-books-list');
        list.innerHTML = '<p>Error loading recent books. Please try again later.</p>';
    });
} 