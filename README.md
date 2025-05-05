# Book Tracker Web Application

A web application for managing and sharing ebooks, with user authentication and admin functionality.

## Features

- User registration and authentication
- Upload and download ebooks (PDF, DOC, DOCX, EPUB)
- User profile management
- Admin panel for managing users and books
- Book approval system
- Download tracking

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd booktracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/booktracker
JWT_SECRET=your-super-secret-key
PORT=3000
```

4. Create the uploads directory:
```bash
mkdir uploads
```

## Running the Application

1. Start MongoDB:
```bash
mongod
```

2. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. Register a new account or login with existing credentials
2. Upload books using the upload form
3. Browse and download available books
4. Admin users can:
   - Manage users
   - Approve/reject book uploads
   - Delete books and users

## Security

- Passwords are hashed using bcrypt
- JWT authentication for API endpoints
- File type validation for uploads
- Admin-only routes protection

## License

MIT 