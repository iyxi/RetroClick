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

const { isAuthenticatedUser, isManager } = require('../middlewares/auth')

// User auth routes
router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/profile', isAuthenticatedUser, (req, res) => {
    const db = require('../models');
    const User = db.User;
    const Customer = db.Customer;

    Promise.all([
        User.findOne({ where: { id: req.user.id }, attributes: ['id', 'name', 'email', 'role'] }),
        Customer.findOne({ where: { user_id: req.user.id } })
    ])
        .then(([user, customer]) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json({
                success: true,
                user,
                customer: customer || null
            });
        })
        .catch(error => {
            console.log(error);
            return res.status(500).json({ error: 'Error fetching profile', details: error.message });
        });
})
router.post('/update-profile', isAuthenticatedUser, upload.single('image'), updateUser)
router.delete('/deactivate', deactivateUser)

// Admin user management routes
router.get('/users', isAuthenticatedUser, isManager, getAllUsers)
router.get('/users/:id', isAuthenticatedUser, isManager, getSingleUser)
router.put('/users/:id/role', isAuthenticatedUser, isManager, updateUserRole)
router.put('/users/:id/deactivate', isAuthenticatedUser, isManager, deactivateUserAdmin)
router.put('/users/:id/activate', isAuthenticatedUser, isManager, activateUser)
router.put('/users/:id/reset-password', isAuthenticatedUser, isManager, resetUserPassword)
router.delete('/users/:id', isAuthenticatedUser, isManager, deleteUserPermanent)
router.post('/users/:id/send-token', isAuthenticatedUser, isManager, sendToken)

module.exports = router