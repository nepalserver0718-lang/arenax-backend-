const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.get('/', tournamentController.getAllTournaments);
router.get('/active', tournamentController.getActiveTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.get('/category/:type', tournamentController.getTournamentsByType);

// Admin routes
router.post('/create', adminAuth, tournamentController.createTournament);
router.get('/admin/tournaments', adminAuth, tournamentController.getAdminTournaments);
router.get('/admin/dashboard-stats', adminAuth, tournamentController.getDashboardStats);
router.put('/:id/start', adminAuth, tournamentController.startTournament);
router.put('/:id/end', adminAuth, tournamentController.endTournament);
router.put('/:id/cancel', adminAuth, tournamentController.cancelTournament);
router.put('/:id/update', adminAuth, tournamentController.updateTournament);
router.delete('/:id/delete', adminAuth, tournamentController.deleteTournament);

module.exports = router;