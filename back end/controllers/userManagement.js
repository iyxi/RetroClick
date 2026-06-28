const db = require('../models');
const User = db.User;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at'],
            where: { deleted_at: null },
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({
            success: true,
            rows: users
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching users', details: error.message });
    }
};

// Get single user
exports.getSingleUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: ['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at']
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, result: user });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching user', details: error.message });
    }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['admin', 'manager', 'customer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or customer' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.update({ role }, { where: { id } });

        return res.status(200).json({
            success: true,
            message: `User role updated to ${role}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error updating user role', details: error.message });
    }
};

// Deactivate user (soft delete)
exports.deactivateUserAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.is_active) {
            return res.status(400).json({ error: 'User is already deactivated' });
        }

        await User.update({ is_active: false }, { where: { id } });

        return res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error deactivating user', details: error.message });
    }
};

// Activate user
exports.activateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.is_active) {
            return res.status(400).json({ error: 'User is already active' });
        }

        await User.update({ is_active: true }, { where: { id } });

        return res.status(200).json({
            success: true,
            message: 'User activated successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error activating user', details: error.message });
    }
};

// Delete user permanently (admin only)
exports.deleteUserPermanent = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Soft delete
        await User.update({ deleted_at: new Date() }, { where: { id } });

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error deleting user', details: error.message });
    }
};

// Update user password (admin can reset)
exports.resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await User.update({ password: hashedPassword }, { where: { id } });

        return res.status(200).json({
            success: true,
            message: 'User password reset successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error resetting password', details: error.message });
    }
};

// Send saved token to user via email (admin only)
exports.sendToken = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let token = user.auth_token;
        if (!token) {
            token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
            await user.update({ auth_token: token });
        }

        // send email
        try {
            await sendEmail({ email: user.email, subject: 'Your authentication token', message: `Your token: ${token}` });
        } catch (err) {
            console.error('Failed to send email:', err.message);
            return res.status(500).json({ error: 'Failed to send token', details: err.message });
        }

        return res.status(200).json({ success: true, message: 'Token sent' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error sending token', details: error.message });
    }
};
