const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get authenticated user's profile
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile'
        });
    }
});

// Get user profile by ID
router.get('/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('username profile joinedDate tournamentsPlayed tournamentsWon');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('User profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user profile'
        });
    }
});

// Update user profile
router.put('/update', auth, async (req, res) => {
    try {
        const { fullName, mobile, gamingID, avatar } = req.body;
        
        // Input validation
        if (mobile && !/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit mobile number'
            });
        }

        const updateData = {};
        if (fullName !== undefined) updateData['profile.fullName'] = fullName;
        if (mobile !== undefined) updateData['profile.mobile'] = mobile;
        if (gamingID !== undefined) updateData['profile.gamingID'] = gamingID;
        if (avatar !== undefined) updateData['profile.avatar'] = avatar;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true 
            }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Profile update error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(val => val.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating profile'
        });
    }
});

module.exports = router;