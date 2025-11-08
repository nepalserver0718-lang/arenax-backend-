const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
    tournamentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tournament',
        required: true
    },
    winners: [{
        rank: { 
            type: Number, 
            required: true,
            min: 1,
            max: 3
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
        prize: { 
            type: Number, 
            required: true,
            min: 0
        },
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            required: true
        }
    }],
    totalPrize: { 
        type: Number, 
        required: true,
        min: 0
    },
    declaredBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin',
        required: true
    },
    declaredAt: { 
        type: Date, 
        default: Date.now
    },
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    paymentProcessedAt: { 
        type: Date
    }
}, {
    timestamps: true
});

// Index for tournament winner queries
winnerSchema.index({ tournamentId: 1 }, { unique: true });
winnerSchema.index({ declaredAt: -1 });

module.exports = mongoose.model('Winner', winnerSchema);