const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/booktracker';

async function createOrUpdateAdmin() {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    let user = await User.findOne({ email: 'gege@gmail.com' });
    if (user) {
        user.password = 'gege1234';
        user.isAdmin = true;
        await user.save();
        console.log('Updated existing user to admin:', user.email);
    } else {
        user = new User({
            username: 'gege',
            email: 'gege@gmail.com',
            password: 'gege1234',
            isAdmin: true
        });
        await user.save();
        console.log('Created new admin user:', user.email);
    }
    mongoose.disconnect();
}

createOrUpdateAdmin().catch(err => {
    console.error('Error creating/updating admin:', err);
    mongoose.disconnect();
}); 