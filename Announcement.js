const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    type: { 
        type: String, 
        required: true,
        enum: ['tournament', 'winner', 'maintenance', 'general']
    },
    target: { 
        type: String, 
        required: true,
        enum: ['all', 'tournament', 'winners']
    },
    tournamentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tournament'
    },
    content: { 
        type: String, 
        required: true
    },
    sentBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin',
        required: true
    },
    sentAt: { 
        type: Date, 
        default: Date.now
    },
    scheduledFor: { 
        type: Date
    },
    status: { 
        type: String, 
        enum: ['draft', 'scheduled', 'sent', 'failed'],
        default: 'draft'
    },
    stats: {
        sentTo: { type: Number, default: 0 },
        readBy: { type: Number, default: 0 }
    },
    isActive: { 
        type: Boolean, 
        default: true
    }
}, {
    timestamps: true
});

// Index for announcement queries
announcementSchema.index({ sentAt: -1 });
announcementSchema.index({ type: 1, status: 1 });
announcementSchema.index({ tournamentId: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);