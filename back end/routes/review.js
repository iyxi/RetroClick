const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const { isAuthenticatedUser, isAdmin, isManager } = require('../middlewares/auth');
const { createReview, getItemReviews, listAllReviews, updateVisibility, deleteReview, checkEligibility } = require('../controllers/review');

// Public
router.get('/public/items/:itemId/reviews', getItemReviews);

// Eligibility check for current user
router.get('/reviews/eligible', isAuthenticatedUser, checkEligibility);

// Create review (customer)
router.post('/reviews', isAuthenticatedUser, upload.array('images', 5), createReview);

// Admin routes
router.get('/reviews', isAuthenticatedUser, isAdmin, listAllReviews);
router.put('/reviews/:id/visibility', isAuthenticatedUser, isAdmin, updateVisibility);
router.delete('/reviews/:id', isAuthenticatedUser, isAdmin, deleteReview);

module.exports = router;
