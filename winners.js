const express = require('express');
const router = express.Router();
const winnerController = require('../controllers/winnerController');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.get('/tournament/:tournamentId', winnerController.getTournamentWinners);
router.get('/recent', winnerController.getRecentWinners);

// Admin routes
router.post('/declare', adminAuth, winnerController.declareWinners);
router.get('/admin/history', adminAuth, winnerController.getWinnerHistory);
router.post('/admin/distribute-prizes', adminAuth, winnerController.distributePrizes);
router.get('/admin/:id', adminAuth, winnerController.getWinnerDeclarationById);
router.put('/admin/:id/update', adminAuth, winnerController.updateWinnerDeclaration);

module.exports = router;