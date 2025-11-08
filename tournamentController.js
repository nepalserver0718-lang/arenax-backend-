const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Winner = require('../models/Winner');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
exports.getAllTournaments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type, game } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (game) filter.game = game;

        const tournaments = await Tournament.find(filter)
            .sort({ startTime: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Tournament.countDocuments(filter);

        res.json({
            success: true,
            data: tournaments,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get active tournaments
// @route   GET /api/tournaments/active
// @access  Public
exports.getActiveTournaments = async (req, res) => {
    try {
        const tournaments = await Tournament.find({
            status: { $in: ['open', 'upcoming', 'live'] }
        }).sort({ startTime: 1 });

        res.json({
            success: true,
            data: tournaments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public
exports.getTournamentById = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        res.json({
            success: true,
            data: tournament
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get tournaments by type
// @route   GET /api/tournaments/category/:type
// @access  Public
exports.getTournamentsByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { status } = req.query;

        const filter = { type };
        if (status) filter.status = status;

        const tournaments = await Tournament.find(filter)
            .sort({ startTime: 1 });

        res.json({
            success: true,
            data: tournaments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create new tournament
// @route   POST /api/tournaments/create
// @access  Admin
exports.createTournament = async (req, res) => {
    try {
        const {
            name,
            type,
            game,
            entryFee,
            prizePool,
            maxPlayers,
            startTime,
            rules,
            howToPlay,
            prizeDistribution
        } = req.body;

        if (!name || !type || !entryFee || !prizePool || !maxPlayers || !startTime || !rules || !howToPlay) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (new Date(startTime) <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Start time must be in the future'
            });
        }

        const tournament = new Tournament({
            name,
            type,
            game: game || 'freefire',
            entryFee,
            prizePool,
            maxPlayers,
            startTime,
            rules,
            howToPlay,
            prizeDistribution: prizeDistribution || {},
            createdBy: req.user._id,
            status: new Date(startTime) > new Date() ? 'open' : 'upcoming'
        });

        await tournament.save();

        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            data: tournament
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create tournament',
            error: error.message
        });
    }
};

// @desc    Get admin tournaments
// @route   GET /api/tournaments/admin/tournaments
// @access  Admin
exports.getAdminTournaments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type, game } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (game) filter.game = game;

        const tournaments = await Tournament.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Tournament.countDocuments(filter);

        res.json({
            success: true,
            data: tournaments,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/tournaments/admin/dashboard-stats
// @access  Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const totalTournaments = await Tournament.countDocuments();
        const activeTournaments = await Tournament.countDocuments({ 
            status: { $in: ['open', 'upcoming', 'live'] } 
        });
        const completedTournaments = await Tournament.countDocuments({ 
            status: 'completed' 
        });

        const revenueData = await Registration.aggregate([
            {
                $match: { 
                    status: 'confirmed',
                    paymentStatus: 'paid'
                }
            },
            {
                $lookup: {
                    from: 'tournaments',
                    localField: 'tournamentId',
                    foreignField: '_id',
                    as: 'tournament'
                }
            },
            {
                $unwind: '$tournament'
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$tournament.entryFee' }
                }
            }
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentRegistrations = await Registration.countDocuments({
            createdAt: { $gte: last24Hours },
            status: 'confirmed'
        });

        res.json({
            success: true,
            data: {
                totalTournaments,
                activeTournaments,
                completedTournaments,
                totalRevenue,
                recentRegistrations,
                totalRegistrations: await Registration.countDocuments({ status: 'confirmed' })
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Start tournament
// @route   PUT /api/tournaments/:id/start
// @access  Admin
exports.startTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.status !== 'open' && tournament.status !== 'upcoming') {
            return res.status(400).json({
                success: false,
                message: 'Tournament cannot be started'
            });
        }

        tournament.status = 'live';
        await tournament.save();

        res.json({
            success: true,
            message: 'Tournament started successfully',
            data: tournament
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start tournament',
            error: error.message
        });
    }
};

// @desc    End tournament
// @route   PUT /api/tournaments/:id/end
// @access  Admin
exports.endTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.status !== 'live') {
            return res.status(400).json({
                success: false,
                message: 'Only live tournaments can be ended'
            });
        }

        tournament.status = 'completed';
        tournament.endTime = new Date();
        await tournament.save();

        res.json({
            success: true,
            message: 'Tournament ended successfully',
            data: tournament
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to end tournament',
            error: error.message
        });
    }
};

// @desc    Cancel tournament
// @route   PUT /api/tournaments/:id/cancel
// @access  Admin
exports.cancelTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Completed tournaments cannot be cancelled'
            });
        }

        tournament.status = 'cancelled';
        await tournament.save();

        res.json({
            success: true,
            message: 'Tournament cancelled successfully',
            data: tournament
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cancel tournament',
            error: error.message
        });
    }
};

// @desc    Update tournament
// @route   PUT /api/tournaments/:id/update
// @access  Admin
exports.updateTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        const allowedUpdates = [
            'name', 'entryFee', 'prizePool', 'maxPlayers', 
            'startTime', 'rules', 'howToPlay', 'prizeDistribution'
        ];
        
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                tournament[field] = req.body[field];
            }
        });

        await tournament.save();

        res.json({
            success: true,
            message: 'Tournament updated successfully',
            data: tournament
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update tournament',
            error: error.message
        });
    }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id/delete
// @access  Admin
exports.deleteTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        const registrationsCount = await Registration.countDocuments({
            tournamentId: tournament._id
        });

        if (registrationsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete tournament with active registrations'
            });
        }

        await Tournament.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Tournament deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete tournament',
            error: error.message
        });
    }
};