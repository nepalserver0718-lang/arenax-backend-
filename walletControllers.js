const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Get wallet balance
exports.getWalletBalance = async (req, res) => {
    try {
        console.log('Fetching wallet balance for user:', req.user._id);
        
        let wallet = await Wallet.findOne({ userId: req.user._id });
        
        if (!wallet) {
            console.log('Creating new wallet for user');
            wallet = new Wallet({ 
                userId: req.user._id,
                balance: {
                    main: req.user.walletBalance || 0,
                    winning: 0
                }
            });
            await wallet.save();
        }
        
        console.log('Wallet balance found:', wallet.balance);
        
        res.json({
            success: true,
            totalBalance: wallet.balance.main + wallet.balance.winning,
            mainBalance: wallet.balance.main,
            winningBalance: wallet.balance.winning
        });
    } catch (error) {
        console.error('Wallet balance error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Add cash request
exports.addCashRequest = async (req, res) => {
    try {
        const { amount, upiTransactionId, upiId } = req.body;
        const screenshot = req.file ? `/uploads/${req.file.filename}` : null;
        
        console.log('Add cash request:', { amount, upiTransactionId, upiId, screenshot });

        // Validate amount
        if (!amount || amount < 10 || amount > 1000) {
            if (screenshot) {
                fs.unlinkSync(req.file.path);
            }
            return res.json({ 
                success: false, 
                message: 'Amount must be between ₹10 and ₹1000' 
            });
        }

        // Validate transaction ID
        if (!upiTransactionId) {
            if (screenshot) {
                fs.unlinkSync(req.file.path);
            }
            return res.json({ 
                success: false, 
                message: 'Transaction ID is required' 
            });
        }

        // Get or create wallet
        let wallet = await Wallet.findOne({ userId: req.user._id });
        if (!wallet) {
            wallet = new Wallet({ userId: req.user._id });
            await wallet.save();
        }

        // Create transaction
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'add_cash',
            amount: parseFloat(amount),
            status: 'pending',
            upiId: upiId,
            transactionId: upiTransactionId,
            screenshot: screenshot
        });

        await transaction.save();
        
        console.log('Add cash transaction created:', transaction.transactionId);

        res.json({ 
            success: true, 
            message: 'Add cash request submitted for approval',
            transactionId: transaction.transactionId
        });
    } catch (error) {
        console.error('Add cash error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
};

// Withdrawal request with 24-hour limit
exports.withdrawRequest = async (req, res) => {
    try {
        const { amount, method, upiId, bankDetails } = req.body;
        
        console.log('Withdrawal request:', { amount, method, upiId, bankDetails });

        // Validate amount
        if (!amount || amount < 10 || amount > 50) {
            return res.json({ 
                success: false, 
                message: 'Withdrawal amount must be between ₹10 and ₹50' 
            });
        }

        // Get or create wallet
        let wallet = await Wallet.findOne({ userId: req.user._id });
        if (!wallet) {
            wallet = new Wallet({ userId: req.user._id });
            await wallet.save();
        }

        // Check winning balance
        if (wallet.balance.winning < amount) {
            return res.json({ 
                success: false, 
                message: 'Insufficient winning balance' 
            });
        }

        // Check 24-hour withdrawal limit
        const lastWithdrawal = await Transaction.findOne({
            userId: req.user._id,
            type: 'withdraw',
            status: 'approved'
        }).sort({ createdAt: -1 });

        if (lastWithdrawal) {
            const hoursSinceLastWithdrawal = (Date.now() - lastWithdrawal.createdAt) / (1000 * 60 * 60);
            if (hoursSinceLastWithdrawal < 24) {
                const hoursLeft = (24 - hoursSinceLastWithdrawal).toFixed(1);
                return res.json({
                    success: false,
                    message: `You can only make 1 withdrawal every 24 hours. Next withdrawal available in ${hoursLeft} hours.`
                });
            }
        }

        // Calculate tax (10%)
        const taxAmount = amount * 0.10;
        const netAmount = amount - taxAmount;

        // Create withdrawal transaction
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'withdraw',
            amount: parseFloat(amount),
            taxAmount: taxAmount,
            netAmount: netAmount,
            status: 'pending',
            upiId: upiId,
            bankDetails: bankDetails
        });

        await transaction.save();

        // Reserve the amount (deduct from available balance)
        wallet.balance.winning -= parseFloat(amount);
        await wallet.save();
        
        console.log('Withdrawal transaction created:', transaction.transactionId);

        res.json({ 
            success: true, 
            message: 'Withdrawal request submitted',
            transactionId: transaction.transactionId
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
};

// Get transactions
exports.getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, filter = 'all', startDate, endDate } = req.query;
        
        console.log('Fetching transactions:', { page, limit, filter, startDate, endDate });

        let query = { userId: req.user._id };
        
        // Apply filter
        if (filter !== 'all') {
            query.type = filter;
        }
        
        // Apply date filter
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            transactions,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            hasMore: page < Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Check withdrawal limit
exports.checkWithdrawalLimit = async (req, res) => {
    try {
        const lastWithdrawal = await Transaction.findOne({
            userId: req.user._id,
            type: 'withdraw',
            status: 'approved'
        }).sort({ createdAt: -1 });

        if (lastWithdrawal) {
            const hoursSinceLastWithdrawal = (Date.now() - lastWithdrawal.createdAt) / (1000 * 60 * 60);
            
            if (hoursSinceLastWithdrawal < 24) {
                const hoursLeft = (24 - hoursSinceLastWithdrawal).toFixed(1);
                const nextWithdrawalTime = new Date(lastWithdrawal.createdAt.getTime() + (24 * 60 * 60 * 1000));
                
                return res.json({
                    success: true,
                    withdrawalBlocked: true,
                    nextWithdrawalTime: nextWithdrawalTime.toLocaleString('en-IN'),
                    hoursLeft: hoursLeft
                });
            }
        }

        res.json({
            success: true,
            withdrawalBlocked: false
        });
    } catch (error) {
        console.error('Withdrawal limit error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};