const express = require('express');
const router = express.Router();
const upload = require('../utils/multer')

const { getAllItems,
    getSingleItem,
    createItem,
    updateItem,
    deleteItem,
    archiveItem,
    restoreItem,
    getPublicItems } = require('../controllers/item')
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth')

router.get('/items', isAuthenticatedUser, getAllItems)
router.get('/items/:id', isAuthenticatedUser, getSingleItem)
router.get('/public/items', getPublicItems)
router.post('/items', isAuthenticatedUser, isAdmin, upload.single('image'), createItem)
// Allow multipart POST to update items (some clients can't send multipart PUT)
router.post('/items/:id', isAuthenticatedUser, isAdmin, upload.single('image'), updateItem)
router.put('/items/:id', isAuthenticatedUser, isAdmin, upload.single('image'), updateItem)
router.put('/items/:id/archive', isAuthenticatedUser, isAdmin, archiveItem)
router.put('/items/:id/restore', isAuthenticatedUser, isAdmin, restoreItem)
router.delete('/items/:id', isAuthenticatedUser, isAdmin, deleteItem)

module.exports = router;