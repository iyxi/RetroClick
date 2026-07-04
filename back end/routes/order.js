const express = require('express');
const router = express.Router();
const { 
    getAllOrders,
    getSingleOrder,
    createOrder,
    updateOrder,
    deleteOrder
} = require('../controllers/order');
const { isAuthenticatedUser, isManager } = require('../middlewares/auth');

router.get('/orders', isAuthenticatedUser, isManager, getAllOrders);
router.get('/orders/:id', isAuthenticatedUser, isManager, getSingleOrder);
router.post('/orders', isAuthenticatedUser, isManager, createOrder);
router.put('/orders/:id', isAuthenticatedUser, isManager, updateOrder);
router.delete('/orders/:id', isAuthenticatedUser, isManager, deleteOrder);

module.exports = router;