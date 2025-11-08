const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Wallet } = require('../models/Wallet');
const User = require('../models/User');

// Add money to wallet
router.post('/add-money', auth, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // Find or create wallet
        let wallet = await Wallet.findOne({ userId: req.user._id });
        
        if (!wallet) {
            wallet = new Wallet({
                userId: req.user._id,
                balance: 0,
                totalDeposits: 0,
                totalWithdrawals: 0
            });
        }

        // Add money to wallet
        wallet.balance += amount;
        wallet.totalDeposits += amount;
        await wallet.save();

        // Update user's wallet balance
        await User.findByIdAndUpdate(req.user._id, {
            walletBalance: wallet.balance
        });

        res.json({
            success: true,
            message: `₹${amount} added to wallet successfully`,
            newBalance: wallet.balance
        });

    } catch (error) {
        console.error('Add money error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get wallet balance
router.get('/balance', auth, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user._id });
        
        res.json({
            success: true,
            balance: wallet ? wallet.balance : 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get transaction history
router.get('/transactions', auth, async (req, res) => {
    try {
        // For now, return empty array - implement later
        res.json({
            success: true,
            transactions: []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;