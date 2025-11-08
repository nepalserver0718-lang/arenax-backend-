const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');
const bcrypt = require('bcryptjs');

// ✅ GET DASHBOARD STATS - REAL DATA
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const pendingDeposits = await Transaction.countDocuments({ 
            status: 'pending', 
            type: 'add_cash' 
        });
        const pendingWithdrawals = await Transaction.countDocuments({ 
            status: 'pending', 
            type: 'withdraw' 
        });
        
        // Total platform balance
        const users = await User.find();
        const totalBalance = users.reduce((sum, user) => sum + user.walletBalance, 0);
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                pendingDeposits,
                pendingWithdrawals,
                totalBalance
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

// ✅ GET ALL PENDING DEPOSITS - REAL DATA
router.get('/deposits/pending', adminAuth, async (req, res) => {
    try {
        const deposits = await Transaction.find({ 
            status: 'pending', 
            type: 'add_cash' 
        })
        .populate('userId', 'username email phone')
        .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            deposits: deposits
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

// ✅ GET ALL PENDING WITHDRAWALS - REAL DATA
router.get('/withdrawals/pending', adminAuth, async (req, res) => {
    try {
        const withdrawals = await Transaction.find({ 
            status: 'pending', 
            type: 'withdraw' 
        })
        .populate('userId', 'username email phone walletBalance')
        .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            withdrawals: withdrawals
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

// ✅ APPROVE/DECLINE DEPOSIT - REAL ACTION
router.put('/deposits/:id/action', adminAuth, async (req, res) => {
    try {
        const { action, adminNotes } = req.body; // 'approve' or 'reject'
        const transactionId = req.params.id;
        
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Transaction already processed"
            });
        }

        // Update transaction status
        transaction.status = action === 'approve' ? 'approved' : 'rejected';
        transaction.adminNotes = adminNotes;
        transaction.approvedBy = req.user._id;
        transaction.approvedAt = new Date();

        // ✅ AGAR APPROVE HUA TO USER KE WALLET MEIN PAISA ADD KARO
        if (action === 'approve') {
            const user = await User.findById(transaction.userId);
            if (user) {
                user.walletBalance += transaction.amount;
                await user.save();
            }
        }

        await transaction.save();
        
        res.json({
            success: true,
            message: `Deposit ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            transaction: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

// ✅ PROCESS WITHDRAWAL - REAL ACTION
router.put('/withdrawals/:id/action', adminAuth, async (req, res) => {
    try {
        const { action, adminNotes } = req.body; // 'approve' or 'reject'
        const transactionId = req.params.id;
        
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Transaction already processed"
            });
        }

        // Update transaction status
        transaction.status = action === 'approve' ? 'approved' : 'rejected';
        transaction.adminNotes = adminNotes;
        transaction.approvedBy = req.user._id;
        transaction.approvedAt = new Date();

        // ✅ AGAR REJECT HUA TO USER KE WALLET MEIN PAISA WAPAS KARO
        if (action === 'reject') {
            const user = await User.findById(transaction.userId);
            if (user) {
                user.walletBalance += transaction.amount;
                await user.save();
            }
        }

        await transaction.save();
        
        res.json({
            success: true,
            message: `Withdrawal ${action === 'approve' ? 'processed' : 'rejected'} successfully`,
            transaction: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

// ✅ GET ALL USERS - REAL DATA
router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

module.exports = router;