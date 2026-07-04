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
    getPublicItems,
    searchPublicItems } = require('../controllers/item')
const { isAuthenticatedUser, isManager } = require('../middlewares/auth')

router.get('/items', isAuthenticatedUser, isManager, getAllItems)
router.get('/items/:id', isAuthenticatedUser, isManager, getSingleItem)
router.get('/public/items/search', searchPublicItems)
router.get('/public/items', getPublicItems)
router.post('/items', isAuthenticatedUser, isManager, upload.array('images', 5), createItem)
// Allow multipart POST to update items (some clients can't send multipart PUT)
router.post('/items/:id', isAuthenticatedUser, isManager, upload.array('images', 5), updateItem)
router.put('/items/:id', isAuthenticatedUser, isManager, upload.array('images', 5), updateItem)
router.put('/items/:id/archive', isAuthenticatedUser, isManager, archiveItem)
router.put('/items/:id/restore', isAuthenticatedUser, isManager, restoreItem)
router.delete('/items/:id', isAuthenticatedUser, isManager, deleteItem)

module.exports = router;