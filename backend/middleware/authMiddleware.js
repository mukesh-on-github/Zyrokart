// Firebase Authentication Middleware
const admin = require('firebase-admin');

// Note: admin.initializeApp() is typically called in index.js or a separate config file.
// Ensure it is initialized before this middleware runs.

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Attach user info to request
        // We use 'uid' from Firebase as the unique identifier
        // In a real app, you might also look up the user in your MongoDB here
        // to attach the full MongoDB _id if needed.
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            // You can add more claims here if needed
            id: decodedToken.uid // Mapping uid to id for compatibility with controllers
        };

        next();
    } catch (error) {
        // Handle specific error codes if needed (e.g., token expired)
        console.error('Auth Error:', error.code, error.message);
        
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message
        });
    }
};

module.exports = authMiddleware;