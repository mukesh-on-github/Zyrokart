const User = require('../models/User');

// Get Wallet Balance
exports.getWalletBalance = async (req, res) => {
    try {
        // Assuming req.user is populated by authMiddleware and contains the user's ID
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Return the balance, defaulting to 0 if not set
        res.status(200).json({ 
            success: true, 
            balance: user.walletBalance || 0,
            currency: "INR"
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch wallet balance",
            error: error.message 
        });
    }
};

// Add Money to Wallet (Mock function for demo purposes)
exports.addMoneyToWallet = async (req, res) => {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid amount"
        });
    }

    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        // In a production app, verify payment success here before adding balance.
        // For this demo/mock, we directly add the amount.
        const currentBalance = user.walletBalance || 0;
        user.walletBalance = currentBalance + Number(amount);
        
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: "Money added successfully", 
            newBalance: user.walletBalance 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to add money to wallet",
            error: error.message 
        });
    }
};