const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    next();
};

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete all books uploaded by the user
        await Book.deleteMany({ uploadedBy: user._id });
        await User.deleteOne({ _id: user._id });

        res.json({ message: 'User and their books deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending books
router.get('/pending-books', auth, isAdmin, async (req, res) => {
    try {
        const books = await Book.find({ isApproved: false })
            .populate('uploadedBy', 'username')
            .sort({ createdAt: -1 });
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve book
router.put('/approve-book/:id', auth, isAdmin, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        book.isApproved = true;
        await book.save();

        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete book
router.delete('/books/:id', auth, isAdmin, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        await book.remove();
        res.json({ message: 'Book deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user (admin only)
router.put('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const { username, email, isAdmin, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.username = username;
        user.email = email;
        user.isAdmin = isAdmin;
        if (password && password.trim() !== '') {
            user.password = password; // Will be hashed by pre-save hook
        }
        await user.save();

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// Get all books (admin only)
router.get('/all-books', auth, isAdmin, async (req, res) => {
    console.log('HIT /api/admin/all-books', req.user);
    try {
        const books = await Book.find()
            .populate('uploadedBy', 'username')
            .sort({ createdAt: -1 });
        res.json(books);
    } catch (error) {
        console.error('Get all books error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 