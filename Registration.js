const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    tournamentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tournament',
        required: true
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    playerId: { 
        type: String, 
        required: true,
        trim: true
    },
    playerName: { 
        type: String, 
        required: true,
        trim: true
    },
    teamType: { 
        type: String, 
        enum: ['solo', 'duo', 'squad'],
        required: true
    },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    entryFeePaid: { 
        type: Number, 
        default: 0
    },
    transactionId: { 
        type: String 
    },
    registeredAt: { 
        type: Date, 
        default: Date.now
    }
}, {
    timestamps: true
});

// Prevent duplicate registrations
registrationSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });
registrationSchema.index({ tournamentId: 1, playerId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);