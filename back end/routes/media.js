const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth');
const {
    getAllMedia,
    getSingleMedia,
    createMedia,
    updateMedia,
    deleteMedia
} = require('../controllers/media');

router.get('/media', isAuthenticatedUser, isAdmin, getAllMedia);
router.get('/media/:id', isAuthenticatedUser, isAdmin, getSingleMedia);
router.post('/media', isAuthenticatedUser, isAdmin, upload.any(), createMedia);
router.put('/media/:id', isAuthenticatedUser, isAdmin, updateMedia);
router.delete('/media/:id', isAuthenticatedUser, isAdmin, deleteMedia);

module.exports = router;
