const express = require('express');
const router = express.Router();
const roomDetailsController = require('../controllers/roomDetailsController');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// User routes (get room details for registered users)
router.get('/:tournamentId', auth, roomDetailsController.getRoomDetails);

// Admin routes
router.post('/create', adminAuth, roomDetailsController.createRoomDetails);
router.get('/admin/recent', adminAuth, roomDetailsController.getRecentRoomDetails);
router.get('/admin/:id', adminAuth, roomDetailsController.getRoomDetailsById);
router.put('/admin/:id', adminAuth, roomDetailsController.updateRoomDetails);
router.delete('/admin/:id', adminAuth, roomDetailsController.deleteRoomDetails);
router.post('/admin/:id/add-room', adminAuth, roomDetailsController.addRoom);
router.delete('/admin/:id/remove-room/:roomIndex', adminAuth, roomDetailsController.removeRoom);

module.exports = router;