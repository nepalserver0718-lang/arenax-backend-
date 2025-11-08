const mongoose = require('mongoose');

const roomDetailsSchema = new mongoose.Schema({
    tournamentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tournament',
        required: true
    },
    rooms: [{
        roomId: { 
            type: String, 
            required: true,
            trim: true
        },
        password: { 
            type: String, 
            required: true,
            trim: true
        },
        map: { 
            type: String, 
            required: true,
            enum: ['bermuda', 'purgatory', 'kalahari', 'nexterra', 'alpine'],
            default: 'bermuda'
        },
        maxPlayers: {
            type: Number,
            default: 50
        },
        currentPlayers: {
            type: Number,
            default: 0
        },
        roomStatus: {
            type: String,
            enum: ['active', 'full', 'closed'],
            default: 'active'
        },
        notes: { 
            type: String,
            trim: true
        }
    }],
    startTime: { 
        type: Date, 
        required: true
    },
    autoPublish: { 
        type: Boolean, 
        default: true
    },
    isPublished: { 
        type: Boolean, 
        default: false
    },
    publishedAt: { 
        type: Date
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Index for room availability checks
roomDetailsSchema.index({ tournamentId: 1 });
roomDetailsSchema.index({ startTime: 1 });

module.exports = mongoose.model('RoomDetails', roomDetailsSchema);