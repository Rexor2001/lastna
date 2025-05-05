const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const Bookmark = require('../models/Bookmark');
const fs = require('fs');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Books API is working!' });
});

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.epub'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Upload a book
router.post('/upload', auth, upload.single('book'), async (req, res) => {
    try {
        const { title, author, description } = req.body;
        if (!req.file) {
            console.error('No file uploaded:', req.body, req.file);
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Check if file exists in uploads directory
        if (!fs.existsSync(req.file.path)) {
            console.error('Uploaded file missing:', req.file.path);
            return res.status(500).json({ message: 'File upload failed, file not found on server.' });
        }
        const book = new Book({
            title,
            author,
            description,
            filePath: req.file.path.replace(/\\/g, '/'),
            fileType: path.extname(req.file.originalname).slice(1),
            uploadedBy: req.user.userId,
            isApproved: true
        });

        await book.save();
        res.status(201).json(book);
    } catch (error) {
        console.error('Book upload error:', error, req.body, req.file);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get books uploaded by the current user
router.get('/', auth, async (req, res) => {
    try {
        const books = await Book.find({ uploadedBy: req.user.userId })
            .sort({ createdAt: -1 });
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's books
router.get('/my-books', auth, async (req, res) => {
    try {
        const books = await Book.find({ uploadedBy: req.user.userId })
            .sort({ createdAt: -1 });
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Download a book
router.get('/download/:id', auth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        book.downloads += 1;
        await book.save();

        res.download(book.filePath);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a book
router.delete('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.uploadedBy.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Book.deleteOne({ _id: book._id });
        res.json({ message: 'Book deleted' });
    } catch (error) {
        console.error('Book delete error:', error, 'User:', req.user, 'Book:', req.params.id);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin-only: Get all books
router.get('/admin/all-books', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a bookmark to a book
router.post('/:id/bookmarks', auth, async (req, res) => {
    try {
        const { page, note } = req.body;
        const bookmark = new Bookmark({
            userId: req.user.userId,
            bookId: req.params.id,
            page,
            note
        });
        await bookmark.save();
        res.status(201).json(bookmark);
    } catch (error) {
        res.status(500).json({ message: 'Error adding bookmark', error: error.message });
    }
});

// Get all bookmarks for a book for the current user
router.get('/:id/bookmarks', auth, async (req, res) => {
    try {
        const bookmarks = await Bookmark.find({
            userId: req.user.userId,
            bookId: req.params.id
        }).sort({ createdAt: -1 });
        res.json(bookmarks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookmarks', error: error.message });
    }
});

// Delete a bookmark
router.delete('/bookmarks/:bookmarkId', auth, async (req, res) => {
    try {
        const bookmark = await Bookmark.findOne({
            _id: req.params.bookmarkId,
            userId: req.user.userId
        });
        if (!bookmark) {
            return res.status(404).json({ message: 'Bookmark not found' });
        }
        await Bookmark.deleteOne({ _id: bookmark._id });
        res.json({ message: 'Bookmark deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting bookmark', error: error.message });
    }
});

// Get a single book (only if uploaded by user or user is admin)
router.get('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (book.uploadedBy.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin-only: Cleanup orphaned book records (books whose files are missing)
router.delete('/admin/cleanup-orphaned', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const books = await Book.find();
        let deleted = 0;
        for (const book of books) {
            if (!fs.existsSync(book.filePath)) {
                await Book.deleteOne({ _id: book._id });
                deleted++;
            }
        }
        res.json({ message: `Deleted ${deleted} orphaned book records.` });
    } catch (error) {
        res.status(500).json({ message: 'Error cleaning up orphaned books', error: error.message });
    }
});

// Update a book (admin only)
router.put('/:id', auth, async (req, res) => {
    try {
        // Only allow admins to update any book
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const { title, author, description } = req.body;
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });

        book.title = title;
        book.author = author;
        book.description = description;
        await book.save();

        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Error updating book', error: error.message });
    }
});

module.exports = router; 