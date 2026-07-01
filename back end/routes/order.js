const express = require('express');
const router = express.Router();
const { 
    getAllOrders,
    getSingleOrder,
    createOrder,
    updateOrder,
    deleteOrder
} = require('../controllers/order');
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth');

router.get('/orders', isAuthenticatedUser, isAdmin, getAllOrders);
router.get('/orders/:id', isAuthenticatedUser, isAdmin, getSingleOrder);
router.post('/orders', isAuthenticatedUser, isAdmin, createOrder);
router.put('/orders/:id', isAuthenticatedUser, isAdmin, updateOrder);
router.delete('/orders/:id', isAuthenticatedUser, isAdmin, deleteOrder);

module.exports = router;