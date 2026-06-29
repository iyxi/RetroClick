const express = require('express');
const router = express.Router();
const upload = require('../utils/multer')

const { registerUser,
    loginUser,
    updateUser,
    deactivateUser
} = require('../controllers/user')

const { 
    getAllUsers,
    getSingleUser,
    updateUserRole,
    deactivateUserAdmin,
    activateUser,
    deleteUserPermanent,
    resetUserPassword
} = require('../controllers/userManagement')
const { sendToken } = require('../controllers/userManagement')

const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth')

// User auth routes
router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/update-profile', isAuthenticatedUser, upload.any(), updateUser)
router.delete('/deactivate', deactivateUser)

// Admin user management routes
router.get('/users', isAuthenticatedUser, isAdmin, getAllUsers)
router.get('/users/:id', isAuthenticatedUser, isAdmin, getSingleUser)
router.put('/users/:id/role', isAuthenticatedUser, isAdmin, updateUserRole)
router.put('/users/:id/deactivate', isAuthenticatedUser, isAdmin, deactivateUserAdmin)
router.put('/users/:id/activate', isAuthenticatedUser, isAdmin, activateUser)
router.put('/users/:id/reset-password', isAuthenticatedUser, isAdmin, resetUserPassword)
router.delete('/users/:id', isAuthenticatedUser, isAdmin, deleteUserPermanent)
router.post('/users/:id/send-token', isAuthenticatedUser, isAdmin, sendToken)

module.exports = router