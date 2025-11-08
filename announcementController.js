const Announcement = require('../models/Announcement');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Registration = require('../models/Registration');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Public
exports.getAnnouncements = async (req, res) => {
    try {
        const { page = 1, limit = 10, type } = req.query;
        
        const filter = { 
            status: 'sent',
            isActive: true 
        };
        
        if (type) filter.type = type;

        const announcements = await Announcement.find(filter)
            .populate('tournamentId', 'name type')
            .populate('sentBy', 'username')
            .sort({ sentAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Announcement.countDocuments(filter);

        res.json({
            success: true,
            data: announcements,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get announcements',
            error: error.message
        });
    }
};

// @desc    Get active announcements
// @route   GET /api/announcements/active
// @access  Public
exports.getActiveAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({
            status: 'sent',
            isActive: true,
            $or: [
                { scheduledFor: { $lte: new Date() } },
                { scheduledFor: null }
            ]
        })
        .populate('tournamentId', 'name type')
        .populate('sentBy', 'username')
        .sort({ sentAt: -1 })
        .limit(5);

        res.json({
            success: true,
            data: announcements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get active announcements',
            error: error.message
        });
    }
};

// @desc    Create announcement
// @route   POST /api/announcements/create
// @access  Admin
exports.createAnnouncement = async (req, res) => {
    try {
        const {
            title,
            type,
            target,
            tournamentId,
            content,
            sendImmediately,
            scheduleTime
        } = req.body;

        // Validate required fields
        if (!title || !type || !target || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title, type, target, and content are required'
            });
        }

        // Validate tournament ID if target is tournament-specific
        if (target === 'tournament' && !tournamentId) {
            return res.status(400).json({
                success: false,
                message: 'Tournament ID is required for tournament announcements'
            });
        }

        if (target === 'tournament') {
            const tournament = await Tournament.findById(tournamentId);
            if (!tournament) {
                return res.status(404).json({
                    success: false,
                    message: 'Tournament not found'
                });
            }
        }

        // Determine announcement status
        let status = 'draft';
        let sentAt = null;

        if (sendImmediately) {
            status = 'sent';
            sentAt = new Date();
        } else if (scheduleTime) {
            status = 'scheduled';
            sentAt = new Date(scheduleTime);
        }

        // Create announcement
        const announcement = new Announcement({
            title,
            type,
            target,
            tournamentId: target === 'tournament' ? tournamentId : null,
            content,
            sentBy: req.admin.id,
            sentAt,
            scheduledFor: scheduleTime || null,
            status
        });

        await announcement.save();

        // If sending immediately, process sending
        if (sendImmediately) {
            await this.sendAnnouncementToUsers(announcement);
        }

        res.status(201).json({
            success: true,
            message: sendImmediately ? 'Announcement sent successfully' : 
                     scheduleTime ? 'Announcement scheduled successfully' : 'Announcement saved as draft',
            data: announcement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create announcement',
            error: error.message
        });
    }
};

// @desc    Get all announcements (Admin)
// @route   GET /api/announcements/admin/all
// @access  Admin
exports.getAllAnnouncements = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;

        const announcements = await Announcement.find(filter)
            .populate('tournamentId', 'name type')
            .populate('sentBy', 'username')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Announcement.countDocuments(filter);

        res.json({
            success: true,
            data: announcements,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get announcements',
            error: error.message
        });
    }
};

// @desc    Update announcement
// @route   PUT /api/announcements/admin/:id
// @access  Admin
exports.updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        const {
            title,
            type,
            target,
            tournamentId,
            content,
            isActive
        } = req.body;

        // Update fields
        if (title) announcement.title = title;
        if (type) announcement.type = type;
        if (target) announcement.target = target;
        if (tournamentId) announcement.tournamentId = tournamentId;
        if (content) announcement.content = content;
        if (isActive !== undefined) announcement.isActive = isActive;

        await announcement.save();

        res.json({
            success: true,
            message: 'Announcement updated successfully',
            data: announcement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update announcement',
            error: error.message
        });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/admin/:id
// @access  Admin
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        await Announcement.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete announcement',
            error: error.message
        });
    }
};

// @desc    Resend announcement
// @route   POST /api/announcements/admin/:id/resend
// @access  Admin
exports.resendAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Update sent time and status
        announcement.sentAt = new Date();
        announcement.status = 'sent';
        await announcement.save();

        // Resend to users
        await this.sendAnnouncementToUsers(announcement);

        res.json({
            success: true,
            message: 'Announcement resent successfully',
            data: announcement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to resend announcement',
            error: error.message
        });
    }
};

// @desc    Send announcement to target users
// @access  Private
exports.sendAnnouncementToUsers = async (announcement) => {
    try {
        let targetUsers = [];

        switch (announcement.target) {
            case 'all':
                // Get all active users
                targetUsers = await User.find({ isActive: true }).select('_id');
                break;

            case 'tournament':
                // Get users registered for the specific tournament
                const registrations = await Registration.find({
                    tournamentId: announcement.tournamentId,
                    status: 'confirmed'
                }).select('userId');
                targetUsers = registments.map(reg => ({ _id: reg.userId }));
                break;

            case 'winners':
                // This would require a winners collection or logic
                // For now, return empty - you can implement based on your winner system
                targetUsers = [];
                break;
        }

        // Update announcement stats
        announcement.stats = {
            sentTo: targetUsers.length,
            readBy: 0 // Initially 0, would update when users read
        };

        announcement.status = 'sent';
        await announcement.save();

        // Here you would typically:
        // 1. Send push notifications
        // 2. Send emails
        // 3. Store in user notification inbox
        // 4. Trigger real-time updates

        console.log(`Announcement sent to ${targetUsers.length} users`);

    } catch (error) {
        announcement.status = 'failed';
        await announcement.save();
        throw error;
    }
};

// @desc    Get announcement statistics
// @route   GET /api/announcements/admin/stats
// @access  Admin
exports.getAnnouncementStats = async (req, res) => {
    try {
        const totalAnnouncements = await Announcement.countDocuments();
        const sentAnnouncements = await Announcement.countDocuments({ 
            status: 'sent' 
        });
        const scheduledAnnouncements = await Announcement.countDocuments({ 
            status: 'scheduled' 
        });

        // Total users reached
        const reachData = await Announcement.aggregate([
            {
                $match: { status: 'sent' }
            },
            {
                $group: {
                    _id: null,
                    totalReach: { $sum: '$stats.sentTo' }
                }
            }
        ]);

        const totalReach = reachData.length > 0 ? reachData[0].totalReach : 0;

        res.json({
            success: true,
            data: {
                totalAnnouncements,
                sentAnnouncements,
                scheduledAnnouncements,
                totalReach
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get announcement stats',
            error: error.message
        });
    }
};

// @desc    Process scheduled announcements (to be called by cron job)
// @route   POST /api/announcements/process-scheduled
// @access  System
exports.processScheduledAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        
        const scheduledAnnouncements = await Announcement.find({
            status: 'scheduled',
            scheduledFor: { $lte: now }
        });

        let processed = 0;
        let errors = 0;

        for (let announcement of scheduledAnnouncements) {
            try {
                announcement.status = 'sent';
                announcement.sentAt = now;
                await announcement.save();

                await this.sendAnnouncementToUsers(announcement);
                processed++;

            } catch (error) {
                announcement.status = 'failed';
                await announcement.save();
                errors++;
                console.error(`Failed to process announcement ${announcement._id}:`, error);
            }
        }

        res.json({
            success: true,
            message: `Processed ${processed} announcements, ${errors} errors`,
            data: {
                processed,
                errors
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process scheduled announcements',
            error: error.message
        });
    }
};