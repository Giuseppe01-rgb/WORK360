const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const {
    validateAbsenceRequest,
    validateAbsenceDecision,
    validateAbsenceRequestChanges
} = require('../middleware/validators');
const controller = require('../controllers/absenceRequestController');

// All routes require authentication
router.use(protect);

// Static routes first (before /:id to avoid conflict)
router.post('/', validateAbsenceRequest, controller.create);
router.get('/mine', controller.listMine);
router.get('/all', requireOwner, controller.listAll);

// Parameterized routes
router.get('/:id', controller.getById);
router.post('/:id/cancel', controller.cancel);
router.delete('/:id', controller.deleteRequest);
router.post('/:id/resubmit', validateAbsenceRequest, controller.resubmit);
router.post('/:id/approve', requireOwner, controller.approve);
router.post('/:id/reject', requireOwner, validateAbsenceDecision, controller.reject);
router.post('/:id/request-changes', requireOwner, validateAbsenceRequestChanges, controller.requestChanges);

module.exports = router;
