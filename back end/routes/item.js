const express = require('express');
const router = express.Router();
const upload = require('../utils/multer')

const { getAllItems,
    getSingleItem,
    createItem,
    updateItem,
    deleteItem } = require('../controllers/item')
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth')

router.get('/items', isAuthenticatedUser, getAllItems)
router.get('/items/:id', isAuthenticatedUser, getSingleItem)
router.post('/items', isAuthenticatedUser, isAdmin, upload.single('image'), createItem)
router.put('/items/:id', isAuthenticatedUser, isAdmin, upload.single('image'), updateItem)
router.delete('/items/:id', isAuthenticatedUser, isAdmin, deleteItem)

module.exports = router;