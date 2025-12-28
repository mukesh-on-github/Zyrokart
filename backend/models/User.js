const mongoose = require('mongoose');

// Sub-schema for addresses (embedded)
const addressSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    addressLine1: {
        type: String,
        required: true
    },
    addressLine2: String,
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zipCode: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: 'India'
    },
    isDefault: {
        type: Boolean,
        default: false
    }
});

const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    profile: {
        displayName: String,
        fullName: String,
        photoURL: String,
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say']
        },
        bio: String
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    addresses: [addressSchema],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    preferences: {
        categories: [String], // e.g., ['tech', 'fashion']
        brands: [String],
        size: {
            top: String, // S, M, L
            bottom: String, // 30, 32
            shoe: String
        },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        }
    },
    loyalty: {
        points: {
            type: Number,
            default: 0
        },
        tier: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            default: 'bronze'
        },
        history: [{
            action: String, // 'purchase', 'referral', 'review'
            points: Number,
            date: { type: Date, default: Date.now },
            refId: String // Order ID or other reference
        }]
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    stripeCustomerId: String, // For saved cards
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    lastLogin: Date
}, {
    timestamps: true
});

// Static method to find by Firebase UID
userSchema.statics.findByFirebaseUid = function(uid) {
    return this.findOne({ firebaseUid: uid });
};

// Static method to create from Firebase user
userSchema.statics.createFromFirebase = async function(firebaseUser, additionalData = {}) {
    const userData = {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        profile: {
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
        },
        ...additionalData
    };
    return this.create(userData);
};

// Method to add loyalty points
userSchema.methods.addLoyaltyPoints = async function(points, action, refId) {
    this.loyalty.points += points;
    this.loyalty.history.push({
        action,
        points,
        refId
    });
    
    // Update tier logic (Example)
    if (this.loyalty.points > 5000) this.loyalty.tier = 'platinum';
    else if (this.loyalty.points > 2000) this.loyalty.tier = 'gold';
    else if (this.loyalty.points > 500) this.loyalty.tier = 'silver';
    
    return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;