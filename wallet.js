const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ✅ ADD CASH
router.post('/add-cash', auth, upload.single('screenshot'), async (req, res) => {
    try {
        console.log('✅ Add cash request received');
        
        const { amount, upiId } = req.body;
        const screenshot = req.file ? `/uploads/${req.file.filename}` : null;
        
        // Validation
        if (!amount || amount < 10 || amount > 1000) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.json({
                success: false,
                message: 'Amount must be between ₹10 and ₹1000'
            });
        }
        
        // Auto transaction ID
        const transactionId = 'TX' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // Create transaction
        const transaction = new Transaction({
            userId: req.user.id,
            type: 'add_cash',
            amount: parseFloat(amount),
            status: 'pending',
            upiId: upiId,
            transactionId: transactionId,
            screenshot: screenshot
        });
        
        await transaction.save();
        
        res.json({
            success: true,
            message: 'Payment request submitted for approval',
            transactionId: transaction._id
        });
        
    } catch (error) {
        console.error('Error:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ✅ GET BALANCE
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.json({
                success: false,
                message: "User not found"
            });
        }
        
        res.json({
            success: true,
            totalBalance: user.walletBalance,
            mainBalance: user.walletBalance,
            winningBalance: 0
        });
    } catch (error) {
        res.json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ✅ GET TRANSACTIONS
router.get('/transactions', auth, async (req, res) => {
    try {
        const { limit = 10, page = 1, filter = 'all' } = req.query;
        const skip = (page - 1) * limit;
        
        let query = { userId: req.user.id };
        if (filter !== 'all') query.type = filter;
        
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Transaction.countDocuments(query);
        const hasMore = skip + transactions.length < total;
        
        res.json({
            success: true,
            transactions: transactions,
            hasMore: hasMore,
            total: total
        });
    } catch (error) {
        res.json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

module.exports = router;