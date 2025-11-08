const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    type: { 
        type: String, 
        required: true,
        enum: [
            'solo-custom', 'duo-custom', 'squad-custom', 
            'lone-wolf', 'solo-kill', 'squad-booyah', 
            'duo-top2', 'solo-top3', 'looser-reward', 
            'no-kill', 'landmine'
        ]
    },
    game: { 
        type: String, 
        required: true,
        enum: ['freefire', 'bgmi', 'cod'],
        default: 'freefire'
    },
    entryFee: { 
        type: Number, 
        required: true,
        min: 0
    },
    prizePool: { 
        type: Number, 
        required: true,
        min: 0
    },
    maxPlayers: { 
        type: Number, 
        required: true,
        min: 2,
        max: 1000
    },
    registeredPlayers: { 
        type: Number, 
        default: 0
    },
    status: { 
        type: String, 
        enum: ['open', 'upcoming', 'live', 'completed', 'cancelled'],
        default: 'open'
    },
    startTime: { 
        type: Date, 
        required: true
    },
    endTime: { 
        type: Date
    },
    rules: { 
        type: String, 
        required: true
    },
    howToPlay: { 
        type: String, 
        required: true
    },
    prizeDistribution: {
        firstPrize: { type: Number, default: 0 },
        secondPrize: { type: Number, default: 0 },
        thirdPrize: { type: Number, default: 0 }
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Index for better query performance
tournamentSchema.index({ status: 1, startTime: 1 });
tournamentSchema.index({ type: 1, game: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);