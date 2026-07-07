const express = require('express');
const router = express.Router();
const { getCart, updateCart, clearCart } = require('../controllers/cart');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/cart', isAuthenticatedUser, getCart);
router.put('/cart', isAuthenticatedUser, updateCart);
router.delete('/cart', isAuthenticatedUser, clearCart);

module.exports = router;
