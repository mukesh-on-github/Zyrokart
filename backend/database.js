const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Use the connection string from .env or fallback to local
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zyrokart', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database Name: ${conn.connection.name}`);
        
        // Listen for errors after initial connection
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });

    } catch (error) {
        console.error('🔥 Database connection failed:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;