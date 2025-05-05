const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS Configuration
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Create uploads directory if it doesn't exist
const fs = require('fs');
try {
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }
} catch (err) {
    console.error('Error creating uploads directory:', err);
    process.exit(1);
}

// MongoDB Connection with enhanced error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:n8GvZLChcyPIMnay@cluster0.eb80mr0.mongodb.net/booktracker?retryWrites=true&w=majority';

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
};

// Function to handle MongoDB connection
async function connectToMongoDB() {
    try {
        console.log('Attempting to connect to MongoDB...');
        
        // Check if we have a valid connection string
        if (!MONGODB_URI) {
            throw new Error('MongoDB connection string is missing. Please set MONGODB_URI in your .env file');
        }

        // Log connection attempt (but hide credentials)
        const safeUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
        console.log('Connecting to MongoDB at:', safeUri);
        
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        
        // Connection events
        mongoose.connection.on('connected', () => {
            console.log('MongoDB Connected Successfully');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB Connection Error:', err);
            if (err.name === 'MongoServerError' && err.code === 8000) {
                console.error('Authentication failed. Please check your MongoDB credentials.');
                console.error('Make sure your username and password are correct in the connection string.');
            }
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB Disconnected');
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error during MongoDB disconnection:', err);
                process.exit(1);
            }
        });

    } catch (err) {
        console.error('MongoDB Initial Connection Error:', err);
        console.error('Please make sure MongoDB is installed and running on your system.');
        console.error('You can download MongoDB from: https://www.mongodb.com/try/download/community');
        process.exit(1);
    }
}

// Call the connection function
connectToMongoDB();

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation Error',
            errors: err.errors
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            message: 'Unauthorized Access'
        });
    }
    
    // Default error response
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Routes with error handling
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Wrap route handlers in try-catch
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/admin', require('./routes/admin'));

// Test route with error handling
app.get('/api/test', (req, res) => {
    try {
        res.json({ message: 'API is working!' });
    } catch (err) {
        console.error('Test route error:', err);
        res.status(500).json({ message: 'Test route error' });
    }
});

// Serve static files with error handling
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (err) {
        console.error('Error serving static file:', err);
        res.status(500).json({ message: 'Error serving static file' });
    }
});

// Handle 404 with error logging
app.use((req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({ message: 'Route not found' });
});

// Start server with error handling
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log('To test the API, visit: http://localhost:3001/api/test');
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
});

// TEMPORARY: Create an admin user (remove after use)
app.get('/create-admin', async (req, res) => {
    const User = require('./models/User');
    const username = 'admin';
    const email = 'gege@gmail.com';
    const password = 'gege1234'; // plain text, let Mongoose hash it!

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Admin already exists' });
        }
        user = new User({
            username,
            email,
            password, // plain text!
            isAdmin: true
        });
        await user.save();
        res.json({ message: 'Admin user created!', username, email, password });
    } catch (err) {
        res.status(500).json({ message: 'Error creating admin', error: err.message });
    }
}); 
