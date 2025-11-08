const RoomDetails = require('../models/RoomDetails');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');

// @desc    Get room details for tournament (for registered users)
// @route   GET /api/room-details/:tournamentId
// @access  Private
exports.getRoomDetails = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.id;

        // Check if user is registered for the tournament
        const registration = await Registration.findOne({
            tournamentId,
            userId,
            status: 'confirmed'
        });

        if (!registration) {
            return res.status(403).json({
                success: false,
                message: 'You are not registered for this tournament'
            });
        }

        // Get room details
        const roomDetails = await RoomDetails.findOne({ tournamentId })
            .populate('tournamentId');

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not available yet'
            });
        }

        const tournament = roomDetails.tournamentId;
        const now = new Date();
        const startTime = new Date(roomDetails.startTime);
        const fiveMinutesBefore = new Date(startTime.getTime() - 5 * 60 * 1000);

        // Check if room details should be available (5 minutes before start)
        if (now < fiveMinutesBefore && !roomDetails.isPublished) {
            return res.json({
                success: true,
                data: {
                    available: false,
                    message: 'Room details will be available 5 minutes before tournament start'
                }
            });
        }

        // Auto-publish if it's time
        if (now >= fiveMinutesBefore && !roomDetails.isPublished && roomDetails.autoPublish) {
            roomDetails.isPublished = true;
            roomDetails.publishedAt = now;
            await roomDetails.save();
        }

        res.json({
            success: true,
            data: {
                available: roomDetails.isPublished,
                rooms: roomDetails.rooms,
                startTime: roomDetails.startTime,
                publishedAt: roomDetails.publishedAt,
                notes: roomDetails.notes
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get room details',
            error: error.message
        });
    }
};

// @desc    Create room details
// @route   POST /api/room-details/create
// @access  Admin
exports.createRoomDetails = async (req, res) => {
    try {
        const {
            tournamentId,
            rooms,
            startTime,
            notes,
            autoPublish
        } = req.body;

        // Check if tournament exists
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Check if room details already exist
        const existingRoomDetails = await RoomDetails.findOne({ tournamentId });
        if (existingRoomDetails) {
            return res.status(400).json({
                success: false,
                message: 'Room details already exist for this tournament'
            });
        }

        // Validate rooms array
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one room is required'
            });
        }

        for (let room of rooms) {
            if (!room.roomId || !room.password || !room.map) {
                return res.status(400).json({
                    success: false,
                    message: 'Each room must have roomId, password, and map'
                });
            }
        }

        // Create room details
        const roomDetails = new RoomDetails({
            tournamentId,
            rooms,
            startTime,
            notes,
            autoPublish: autoPublish !== false,
            createdBy: req.admin.id
        });

        await roomDetails.save();

        res.status(201).json({
            success: true,
            message: 'Room details created successfully',
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create room details',
            error: error.message
        });
    }
};

// @desc    Get recent room details (Admin)
// @route   GET /api/room-details/admin/recent
// @access  Admin
exports.getRecentRoomDetails = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.find()
            .populate('tournamentId')
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get room details',
            error: error.message
        });
    }
};

// @desc    Get room details by ID (Admin)
// @route   GET /api/room-details/admin/:id
// @access  Admin
exports.getRoomDetailsById = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id)
            .populate('tournamentId')
            .populate('createdBy', 'username');

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        res.json({
            success: true,
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get room details',
            error: error.message
        });
    }
};

// @desc    Update room details
// @route   PUT /api/room-details/admin/:id
// @access  Admin
exports.updateRoomDetails = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id);

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        const {
            rooms,
            startTime,
            notes,
            autoPublish
        } = req.body;

        // Update fields
        if (rooms) {
            // Validate rooms array
            if (!Array.isArray(rooms) || rooms.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Rooms must be a non-empty array'
                });
            }

            for (let room of rooms) {
                if (!room.roomId || !room.password || !room.map) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each room must have roomId, password, and map'
                    });
                }
            }
            roomDetails.rooms = rooms;
        }

        if (startTime) roomDetails.startTime = startTime;
        if (notes !== undefined) roomDetails.notes = notes;
        if (autoPublish !== undefined) roomDetails.autoPublish = autoPublish;

        await roomDetails.save();

        res.json({
            success: true,
            message: 'Room details updated successfully',
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update room details',
            error: error.message
        });
    }
};

// @desc    Delete room details
// @route   DELETE /api/room-details/admin/:id
// @access  Admin
exports.deleteRoomDetails = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id);

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        await RoomDetails.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Room details deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete room details',
            error: error.message
        });
    }
};

// @desc    Add room to existing room details
// @route   POST /api/room-details/admin/:id/add-room
// @access  Admin
exports.addRoom = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id);

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        const { roomId, password, map, maxPlayers, notes } = req.body;

        if (!roomId || !password || !map) {
            return res.status(400).json({
                success: false,
                message: 'roomId, password, and map are required'
            });
        }

        // Check if room ID already exists
        const roomExists = roomDetails.rooms.some(room => room.roomId === roomId);
        if (roomExists) {
            return res.status(400).json({
                success: false,
                message: 'Room ID already exists'
            });
        }

        // Add new room
        roomDetails.rooms.push({
            roomId,
            password,
            map,
            maxPlayers: maxPlayers || 50,
            currentPlayers: 0,
            roomStatus: 'active',
            notes
        });

        await roomDetails.save();

        res.json({
            success: true,
            message: 'Room added successfully',
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add room',
            error: error.message
        });
    }
};

// @desc    Remove room from room details
// @route   DELETE /api/room-details/admin/:id/remove-room/:roomIndex
// @access  Admin
exports.removeRoom = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id);
        const roomIndex = parseInt(req.params.roomIndex);

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        if (roomIndex < 0 || roomIndex >= roomDetails.rooms.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room index'
            });
        }

        // Remove the room
        roomDetails.rooms.splice(roomIndex, 1);

        await roomDetails.save();

        res.json({
            success: true,
            message: 'Room removed successfully',
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove room',
            error: error.message
        });
    }
};

// @desc    Publish room details manually
// @route   PUT /api/room-details/admin/:id/publish
// @access  Admin
exports.publishRoomDetails = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id);

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        if (roomDetails.isPublished) {
            return res.status(400).json({
                success: false,
                message: 'Room details already published'
            });
        }

        roomDetails.isPublished = true;
        roomDetails.publishedAt = new Date();
        await roomDetails.save();

        res.json({
            success: true,
            message: 'Room details published successfully',
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to publish room details',
            error: error.message
        });
    }
};

// @desc    Unpublish room details
// @route   PUT /api/room-details/admin/:id/unpublish
// @access  Admin
exports.unpublishRoomDetails = async (req, res) => {
    try {
        const roomDetails = await RoomDetails.findById(req.params.id);

        if (!roomDetails) {
            return res.status(404).json({
                success: false,
                message: 'Room details not found'
            });
        }

        if (!roomDetails.isPublished) {
            return res.status(400).json({
                success: false,
                message: 'Room details are not published'
            });
        }

        roomDetails.isPublished = false;
        await roomDetails.save();

        res.json({
            success: true,
            message: 'Room details unpublished successfully',
            data: roomDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to unpublish room details',
            error: error.message
        });
    }
};