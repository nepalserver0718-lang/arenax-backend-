const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// User routes
router.post('/register', auth, registrationController.registerForTournament);
router.get('/my-registrations', auth, registrationController.getMyRegistrations);
router.get('/check', auth, registrationController.checkRegistration);

// Admin routes
router.get('/admin/registrations', adminAuth, registrationController.getAllRegistrations);
router.get('/admin/:tournamentId', adminAuth, registrationController.getTournamentRegistrations);
router.put('/:id/cancel', adminAuth, registrationController.cancelRegistration);
router.put('/:id/refund', adminAuth, registrationController.processRefund);

module.exports = router;