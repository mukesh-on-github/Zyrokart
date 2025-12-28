const User = require('../models/User');

// Sync Firebase user with MongoDB
exports.syncFirebaseUser = async (req, res) => {
    try {
        const { firebaseUser, additionalData = {} } = req.body;

        if (!firebaseUser || !firebaseUser.uid) {
            return res.status(400).json({
                success: false,
                message: 'Firebase user data is required'
            });
        }

        // Check if user already exists
        let user = await User.findByFirebaseUid(firebaseUser.uid);

        if (user) {
            // Update existing user
            user.email = firebaseUser.email;
            user.profile.displayName = firebaseUser.displayName || user.profile.displayName;
            user.profile.photoURL = firebaseUser.photoURL || user.profile.photoURL;
            user.emailVerified = firebaseUser.emailVerified;
            user.lastLogin = new Date();
            
            await user.save();
        } else {
            // Create new user
            user = await User.createFromFirebase(firebaseUser, additionalData);
        }

        res.json({
            success: true,
            message: 'User synced successfully',
            data: {
                user: {
                    id: user._id,
                    firebaseUid: user.firebaseUid,
                    email: user.email,
                    profile: user.profile,
                    preferences: user.preferences,
                    loyalty: user.loyalty
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'User sync failed',
            error: error.message
        });
    }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-socialLogins');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
    try {
        const { displayName, bio, phone, gender, dateOfBirth } = req.body;

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (displayName) user.profile.displayName = displayName;
        if (bio) user.profile.bio = bio;
        if (phone) user.phone = phone;
        if (gender) user.profile.gender = gender;
        if (dateOfBirth) user.profile.dateOfBirth = dateOfBirth;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// Get User Preferences
exports.getUserPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('preferences');
        res.json({
            success: true,
            data: user.preferences
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch preferences',
            error: error.message
        });
    }
};

// Update User Preferences
exports.updateUserPreferences = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { preferences: req.body } },
            { new: true }
        ).select('preferences');

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: user.preferences
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: error.message
        });
    }
};

// Get Loyalty Info
exports.getLoyaltyInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('loyalty');
        res.json({
            success: true,
            data: user.loyalty
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loyalty info',
            error: error.message
        });
    }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-socialLogins -addresses')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Admin: Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-socialLogins');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
};

// Admin: Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { status },
            { new: true }
        ).select('-socialLogins -addresses');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User status updated successfully',
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: error.message
        });
    }
};