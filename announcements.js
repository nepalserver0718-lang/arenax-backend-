const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// Public routes
router.get('/', announcementController.getAnnouncements);
router.get('/active', announcementController.getActiveAnnouncements);

// Admin routes
router.post('/create', adminAuth, announcementController.createAnnouncement);
router.get('/admin/all', adminAuth, announcementController.getAllAnnouncements);
router.put('/admin/:id', adminAuth, announcementController.updateAnnouncement);
router.delete('/admin/:id', adminAuth, announcementController.deleteAnnouncement);
router.post('/admin/:id/resend', adminAuth, announcementController.resendAnnouncement);

module.exports = router;