const Winner = require('../models/Winner');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// @desc    Get tournament winners
// @route   GET /api/winners/tournament/:tournamentId
// @access  Public
exports.getTournamentWinners = async (req, res) => {
    try {
        const { tournamentId } = req.params;

        const winnerDeclaration = await Winner.findOne({ tournamentId })
            .populate('tournamentId')
            .populate('declaredBy', 'username');

        if (!winnerDeclaration) {
            return res.status(404).json({
                success: false,
                message: 'No winners declared for this tournament yet'
            });
        }

        res.json({
            success: true,
            data: winnerDeclaration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get winners',
            error: error.message
        });
    }
};

// @desc    Get recent winners
// @route   GET /api/winners/recent
// @access  Public
exports.getRecentWinners = async (req, res) => {
    try {
        const winners = await Winner.find()
            .populate('tournamentId')
            .sort({ declaredAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: winners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get recent winners',
            error: error.message
        });
    }
};

// @desc    Declare winners for tournament
// @route   POST /api/winners/declare
// @access  Admin
exports.declareWinners = async (req, res) => {
    try {
        const { tournamentId, winners, totalPrize } = req.body;

        // Check if tournament exists and is completed
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Winners can only be declared for completed tournaments'
            });
        }

        // Check if winners already declared
        const existingWinner = await Winner.findOne({ tournamentId });
        if (existingWinner) {
            return res.status(400).json({
                success: false,
                message: 'Winners already declared for this tournament'
            });
        }

        // Validate winners array
        if (!winners || !Array.isArray(winners) || winners.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one winner is required'
            });
        }

        // Validate total prize doesn't exceed tournament prize pool
        if (totalPrize > tournament.prizePool) {
            return res.status(400).json({
                success: false,
                message: 'Total prize amount exceeds tournament prize pool'
            });
        }

        // Get user IDs for winners
        const winnerDetails = [];
        for (let winner of winners) {
            // Find registration to get userId
            const registration = await Registration.findOne({
                tournamentId,
                playerId: winner.playerId,
                status: 'confirmed'
            });

            if (!registration) {
                return res.status(400).json({
                    success: false,
                    message: `Player ${winner.playerId} is not registered for this tournament`
                });
            }

            winnerDetails.push({
                rank: winner.rank,
                playerId: winner.playerId,
                playerName: winner.playerName,
                prize: winner.prize,
                userId: registration.userId
            });
        }

        // Create winner declaration
        const winnerDeclaration = new Winner({
            tournamentId,
            winners: winnerDetails,
            totalPrize,
            declaredBy: req.admin.id
        });

        await winnerDeclaration.save();

        res.status(201).json({
            success: true,
            message: 'Winners declared successfully',
            data: winnerDeclaration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to declare winners',
            error: error.message
        });
    }
};

// @desc    Get winner history (Admin)
// @route   GET /api/winners/admin/history
// @access  Admin
exports.getWinnerHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const winners = await Winner.find()
            .populate('tournamentId')
            .populate('declaredBy', 'username')
            .sort({ declaredAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Winner.countDocuments();

        res.json({
            success: true,
            data: winners,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get winner history',
            error: error.message
        });
    }
};

// @desc    Distribute prizes to winners
// @route   POST /api/winners/admin/distribute-prizes
// @access  Admin
exports.distributePrizes = async (req, res) => {
    try {
        const { tournamentId } = req.body;

        const winnerDeclaration = await Winner.findOne({ tournamentId })
            .populate('tournamentId');

        if (!winnerDeclaration) {
            return res.status(404).json({
                success: false,
                message: 'No winner declaration found for this tournament'
            });
        }

        if (winnerDeclaration.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Prizes already distributed'
            });
        }

        // Distribute prizes to each winner
        const distributionResults = [];
        
        for (let winner of winnerDeclaration.winners) {
            try {
                // Add prize to winner's wallet
                const wallet = await Wallet.findOne({ userId: winner.userId });
                if (!wallet) {
                    distributionResults.push({
                        playerId: winner.playerId,
                        status: 'failed',
                        message: 'Wallet not found'
                    });
                    continue;
                }

                wallet.balance += winner.prize;
                await wallet.save();

                // Create transaction record
                const transaction = new Transaction({
                    userId: winner.userId,
                    type: 'credit',
                    amount: winner.prize,
                    description: `Prize money for ${winnerDeclaration.tournamentId.name} - ${winner.rank} place`,
                    status: 'completed'
                });
                await transaction.save();

                distributionResults.push({
                    playerId: winner.playerId,
                    status: 'success',
                    amount: winner.prize
                });

            } catch (error) {
                distributionResults.push({
                    playerId: winner.playerId,
                    status: 'failed',
                    message: error.message
                });
            }
        }

        // Update winner declaration status
        const allSuccessful = distributionResults.every(result => result.status === 'success');
        
        winnerDeclaration.paymentStatus = allSuccessful ? 'completed' : 'processing';
        winnerDeclaration.paymentProcessedAt = new Date();
        await winnerDeclaration.save();

        res.json({
            success: true,
            message: allSuccessful ? 'All prizes distributed successfully' : 'Prizes distribution completed with some errors',
            data: {
                winnerDeclaration,
                distributionResults
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to distribute prizes',
            error: error.message
        });
    }
};

// @desc    Get winner declaration by ID (Admin)
// @route   GET /api/winners/admin/:id
// @access  Admin
exports.getWinnerDeclarationById = async (req, res) => {
    try {
        const winnerDeclaration = await Winner.findById(req.params.id)
            .populate('tournamentId')
            .populate('declaredBy', 'username')
            .populate('winners.userId', 'username email');

        if (!winnerDeclaration) {
            return res.status(404).json({
                success: false,
                message: 'Winner declaration not found'
            });
        }

        res.json({
            success: true,
            data: winnerDeclaration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get winner declaration',
            error: error.message
        });
    }
};

// @desc    Update winner declaration
// @route   PUT /api/winners/admin/:id/update
// @access  Admin
exports.updateWinnerDeclaration = async (req, res) => {
    try {
        const winnerDeclaration = await Winner.findById(req.params.id);

        if (!winnerDeclaration) {
            return res.status(404).json({
                success: false,
                message: 'Winner declaration not found'
            });
        }

        if (winnerDeclaration.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update winner declaration after prizes are distributed'
            });
        }

        const { winners, totalPrize } = req.body;

        if (winners) {
            // Validate winners array
            if (!Array.isArray(winners) || winners.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Winners must be a non-empty array'
                });
            }

            // Get user IDs for new winners
            const winnerDetails = [];
            for (let winner of winners) {
                const registration = await Registration.findOne({
                    tournamentId: winnerDeclaration.tournamentId,
                    playerId: winner.playerId,
                    status: 'confirmed'
                });

                if (!registration) {
                    return res.status(400).json({
                        success: false,
                        message: `Player ${winner.playerId} is not registered for this tournament`
                    });
                }

                winnerDetails.push({
                    rank: winner.rank,
                    playerId: winner.playerId,
                    playerName: winner.playerName,
                    prize: winner.prize,
                    userId: registration.userId
                });
            }

            winnerDeclaration.winners = winnerDetails;
        }

        if (totalPrize) {
            winnerDeclaration.totalPrize = totalPrize;
        }

        await winnerDeclaration.save();

        res.json({
            success: true,
            message: 'Winner declaration updated successfully',
            data: winnerDeclaration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update winner declaration',
            error: error.message
        });
    }
};

// @desc    Get winner statistics
// @route   GET /api/winners/admin/stats
// @access  Admin
exports.getWinnerStats = async (req, res) => {
    try {
        const totalDeclarations = await Winner.countDocuments();
        const completedPayments = await Winner.countDocuments({ 
            paymentStatus: 'completed' 
        });
        const pendingPayments = await Winner.countDocuments({ 
            paymentStatus: 'pending' 
        });

        // Total prize money distributed
        const prizeData = await Winner.aggregate([
            {
                $match: { paymentStatus: 'completed' }
            },
            {
                $group: {
                    _id: null,
                    totalPrizeDistributed: { $sum: '$totalPrize' }
                }
            }
        ]);

        const totalPrizeDistributed = prizeData.length > 0 ? prizeData[0].totalPrizeDistributed : 0;

        res.json({
            success: true,
            data: {
                totalDeclarations,
                completedPayments,
                pendingPayments,
                totalPrizeDistributed
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get winner stats',
            error: error.message
        });
    }
};