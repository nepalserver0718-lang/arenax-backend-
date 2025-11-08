const Registration = require('../models/Registration');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// @desc    Register for tournament
// @route   POST /api/registrations/register
// @access  Private
exports.registerForTournament = async (req, res) => {
    try {
        const { tournamentId, playerId, playerName, teamType } = req.body;
        const userId = req.user.id;

        // Check if tournament exists and is open
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'Tournament registration is closed'
            });
        }

        // Check if tournament is full
        if (tournament.registeredPlayers >= tournament.maxPlayers) {
            return res.status(400).json({
                success: false,
                message: 'Tournament is full'
            });
        }

        // Check if user already registered
        const existingRegistration = await Registration.findOne({
            tournamentId,
            $or: [
                { userId },
                { playerId }
            ]
        });

        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: 'Already registered for this tournament'
            });
        }

        // Check wallet balance
        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < tournament.entryFee) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // Create registration
        const registration = new Registration({
            tournamentId,
            userId,
            playerId,
            playerName,
            teamType,
            status: 'pending',
            paymentStatus: 'pending',
            entryFeePaid: tournament.entryFee
        });

        await registration.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: registration,
            registrationId: registration._id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// @desc    Process wallet payment for registration
// @route   POST /api/registrations/process-payment
// @access  Private
exports.processWalletPayment = async (req, res) => {
    try {
        const { registrationId } = req.body;
        const userId = req.user.id;

        const registration = await Registration.findById(registrationId)
            .populate('tournamentId');

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (registration.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Check wallet balance
        const wallet = await Wallet.findOne({ userId });
        if (wallet.balance < registration.tournamentId.entryFee) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // Deduct from wallet
        wallet.balance -= registration.tournamentId.entryFee;
        await wallet.save();

        // Create transaction record
        const transaction = new Transaction({
            userId,
            type: 'debit',
            amount: registration.tournamentId.entryFee,
            description: `Tournament registration: ${registration.tournamentId.name}`,
            status: 'completed'
        });
        await transaction.save();

        // Update registration status
        registration.status = 'confirmed';
        registration.paymentStatus = 'paid';
        registration.transactionId = transaction._id;
        await registration.save();

        // Update tournament registered players count
        await Tournament.findByIdAndUpdate(
            registration.tournamentId._id,
            { $inc: { registeredPlayers: 1 } }
        );

        res.json({
            success: true,
            message: 'Payment successful',
            data: {
                registration,
                newBalance: wallet.balance
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment processing failed',
            error: error.message
        });
    }
};

// @desc    Get user's registrations
// @route   GET /api/registrations/my-registrations
// @access  Private
exports.getMyRegistrations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const registrations = await Registration.find({ userId })
            .populate('tournamentId')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: registrations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get registrations',
            error: error.message
        });
    }
};

// @desc    Check if user is registered for tournament
// @route   GET /api/registrations/check
// @access  Private
exports.checkRegistration = async (req, res) => {
    try {
        const { tournamentId } = req.query;
        const userId = req.user.id;

        const registration = await Registration.findOne({
            tournamentId,
            userId
        }).populate('tournamentId');

        res.json({
            success: true,
            data: {
                registered: !!registration,
                registration: registration
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check registration',
            error: error.message
        });
    }
};

// @desc    Get all registrations (Admin)
// @route   GET /api/registrations/admin/registrations
// @access  Admin
exports.getAllRegistrations = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, tournamentId } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (tournamentId) filter.tournamentId = tournamentId;

        const registrations = await Registration.find(filter)
            .populate('tournamentId')
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Registration.countDocuments(filter);

        res.json({
            success: true,
            data: registrations,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get registrations',
            error: error.message
        });
    }
};

// @desc    Get tournament registrations (Admin)
// @route   GET /api/registrations/admin/:tournamentId
// @access  Admin
exports.getTournamentRegistrations = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        
        const registrations = await Registration.find({ tournamentId })
            .populate('userId', 'username email')
            .sort({ createdAt: 1 });

        res.json({
            success: true,
            data: registrations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get tournament registrations',
            error: error.message
        });
    }
};

// @desc    Cancel registration (Admin)
// @route   PUT /api/registrations/:id/cancel
// @access  Admin
exports.cancelRegistration = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('tournamentId');

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (registration.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Registration already cancelled'
            });
        }

        registration.status = 'cancelled';
        await registration.save();

        // Decrement tournament registered players count
        if (registration.status === 'confirmed') {
            await Tournament.findByIdAndUpdate(
                registration.tournamentId._id,
                { $inc: { registeredPlayers: -1 } }
            );
        }

        res.json({
            success: true,
            message: 'Registration cancelled successfully',
            data: registration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cancel registration',
            error: error.message
        });
    }
};

// @desc    Process refund for cancelled registration
// @route   PUT /api/registrations/:id/refund
// @access  Admin
exports.processRefund = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('tournamentId');

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (registration.paymentStatus !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'No payment to refund'
            });
        }

        if (registration.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Only cancelled registrations can be refunded'
            });
        }

        // Refund to user's wallet
        const wallet = await Wallet.findOne({ userId: registration.userId });
        wallet.balance += registration.entryFeePaid;
        await wallet.save();

        // Create refund transaction
        const transaction = new Transaction({
            userId: registration.userId,
            type: 'credit',
            amount: registration.entryFeePaid,
            description: `Refund for tournament: ${registration.tournamentId.name}`,
            status: 'completed'
        });
        await transaction.save();

        // Update registration payment status
        registration.paymentStatus = 'refunded';
        await registration.save();

        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: {
                registration,
                refundAmount: registration.entryFeePaid
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
};

// @desc    Get registration statistics
// @route   GET /api/registrations/admin/stats
// @access  Admin
exports.getRegistrationStats = async (req, res) => {
    try {
        const totalRegistrations = await Registration.countDocuments();
        const confirmedRegistrations = await Registration.countDocuments({ 
            status: 'confirmed' 
        });
        const pendingRegistrations = await Registration.countDocuments({ 
            status: 'pending' 
        });

        // Revenue from registrations
        const revenueData = await Registration.aggregate([
            {
                $match: { 
                    status: 'confirmed',
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$entryFeePaid' }
                }
            }
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        res.json({
            success: true,
            data: {
                totalRegistrations,
                confirmedRegistrations,
                pendingRegistrations,
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get registration stats',
            error: error.message
        });
    }
};