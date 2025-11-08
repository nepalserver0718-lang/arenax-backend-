// @desc    Validation middleware for tournament creation
// @access  Private (Admin)
const validateTournament = (req, res, next) => {
    const {
        name,
        type,
        entryFee,
        prizePool,
        maxPlayers,
        startTime,
        rules,
        howToPlay
    } = req.body;

    const errors = [];

    // Required fields validation
    if (!name) errors.push('Tournament name is required');
    if (!type) errors.push('Tournament type is required');
    if (!entryFee) errors.push('Entry fee is required');
    if (!prizePool) errors.push('Prize pool is required');
    if (!maxPlayers) errors.push('Max players is required');
    if (!startTime) errors.push('Start time is required');
    if (!rules) errors.push('Rules are required');
    if (!howToPlay) errors.push('How to play instructions are required');

    // Numeric validation
    if (entryFee && (isNaN(entryFee) || entryFee < 0)) {
        errors.push('Entry fee must be a positive number');
    }
    if (prizePool && (isNaN(prizePool) || prizePool < 0)) {
        errors.push('Prize pool must be a positive number');
    }
    if (maxPlayers && (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 1000)) {
        errors.push('Max players must be between 2 and 1000');
    }

    // Date validation
    if (startTime && new Date(startTime) <= new Date()) {
        errors.push('Start time must be in the future');
    }

    // Tournament type validation
    const validTypes = [
        'solo-custom', 'duo-custom', 'squad-custom', 
        'lone-wolf', 'solo-kill', 'squad-booyah', 
        'duo-top2', 'solo-top3', 'looser-reward', 
        'no-kill', 'landmine'
    ];
    if (type && !validTypes.includes(type)) {
        errors.push('Invalid tournament type');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

// @desc    Validation for registration
// @access  Private
const validateRegistration = (req, res, next) => {
    const { tournamentId, playerId, playerName, teamType } = req.body;

    const errors = [];

    if (!tournamentId) errors.push('Tournament ID is required');
    if (!playerId) errors.push('Player ID is required');
    if (!playerName) errors.push('Player name is required');
    if (!teamType) errors.push('Team type is required');

    const validTeamTypes = ['solo', 'duo', 'squad'];
    if (teamType && !validTeamTypes.includes(teamType)) {
        errors.push('Invalid team type');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

// @desc    Validation for room details
// @access  Private (Admin)
const validateRoomDetails = (req, res, next) => {
    const { tournamentId, rooms, startTime } = req.body;

    const errors = [];

    if (!tournamentId) errors.push('Tournament ID is required');
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
        errors.push('At least one room is required');
    }
    if (!startTime) errors.push('Start time is required');

    // Validate each room
    if (rooms && Array.isArray(rooms)) {
        rooms.forEach((room, index) => {
            if (!room.roomId) errors.push(`Room ${index + 1}: Room ID is required`);
            if (!room.password) errors.push(`Room ${index + 1}: Password is required`);
            if (!room.map) errors.push(`Room ${index + 1}: Map is required`);
            
            const validMaps = ['bermuda', 'purgatory', 'kalahari', 'nexterra', 'alpine'];
            if (room.map && !validMaps.includes(room.map)) {
                errors.push(`Room ${index + 1}: Invalid map selection`);
            }
        });
    }

    if (startTime && new Date(startTime) <= new Date()) {
        errors.push('Start time must be in the future');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

// @desc    Validation for winner declaration
// @access  Private (Admin)
const validateWinnerDeclaration = (req, res, next) => {
    const { tournamentId, winners, totalPrize } = req.body;

    const errors = [];

    if (!tournamentId) errors.push('Tournament ID is required');
    if (!winners || !Array.isArray(winners) || winners.length === 0) {
        errors.push('At least one winner is required');
    }
    if (!totalPrize) errors.push('Total prize amount is required');

    // Validate winners array
    if (winners && Array.isArray(winners)) {
        winners.forEach((winner, index) => {
            if (!winner.rank) errors.push(`Winner ${index + 1}: Rank is required`);
            if (!winner.playerId) errors.push(`Winner ${index + 1}: Player ID is required`);
            if (!winner.playerName) errors.push(`Winner ${index + 1}: Player name is required`);
            if (!winner.prize) errors.push(`Winner ${index + 1}: Prize amount is required`);
            
            if (winner.rank && (winner.rank < 1 || winner.rank > 3)) {
                errors.push(`Winner ${index + 1}: Rank must be between 1 and 3`);
            }
            if (winner.prize && (isNaN(winner.prize) || winner.prize < 0)) {
                errors.push(`Winner ${index + 1}: Prize must be a positive number`);
            }
        });
    }

    if (totalPrize && (isNaN(totalPrize) || totalPrize < 0)) {
        errors.push('Total prize must be a positive number');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

module.exports = {
    validateTournament,
    validateRegistration,
    validateRoomDetails,
    validateWinnerDeclaration
};