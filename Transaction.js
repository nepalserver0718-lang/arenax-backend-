const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['add_cash', 'withdraw', 'entry_fee', 'prize_win'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    // ✅ REFERENCEID FIELD REMOVE KARDO YA FIX KARDO
    referenceId: {
        type: String,
        default: null, // ✅ NULL ALLOW KARO
        sparse: true   // ✅ SPARSE INDEX
    },
    upiId: String,
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        accountName: String
    },
    screenshot: String,
    adminNotes: String,
    taxAmount: { type: Number, default: 0 },
    netAmount: Number,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ✅ PRE-SAVE HOOK
transactionSchema.pre('save', function(next) {
    if (!this.transactionId) {
        this.transactionId = 'TX' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
    // ✅ REFERENCEID SET KARO AGAR NULL HAI TO
    if (!this.referenceId) {
        this.referenceId = 'REF' + Date.now();
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);