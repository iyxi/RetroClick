const jwt = require("jsonwebtoken");

exports.isAuthenticatedUser = (req, res, next) => {
    if (!req.header('Authorization')) {
        return res.status(401).json({ message: 'Login first to access this resource' })
    }

    const token = req.header('Authorization').split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Login first to access this resource' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.body = req.body || {}
        req.body.user = { id: decoded.id }
        next()
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' })
    }
};

exports.isAdmin = async (req, res, next) => {
    try {
        const db = require('../models');
        
        // Verify User model is available
        if (!db || !db.User) {
            return res.status(500).json({ message: 'Authorization error', details: 'User model not initialized' });
        }

        const User = db.User;
        const user = await User.findOne({ where: { id: req.body.user.id } });

        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: 'Access denied. Admin or Manager privileges required.' });
        }

        next();
    } catch (error) {
        console.error('isAdmin middleware error:', error);
        return res.status(500).json({ message: 'Authorization error', details: error.message });
    }
};

exports.isManager = async (req, res, next) => {
    try {
        const db = require('../models');
        
        if (!db || !db.User) {
            return res.status(500).json({ message: 'Authorization error', details: 'User model not initialized' });
        }

        const User = db.User;
        const user = await User.findOne({ where: { id: req.body.user.id } });

        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: 'Access denied. Manager privileges required.' });
        }

        next();
    } catch (error) {
        console.error('isManager middleware error:', error);
        return res.status(500).json({ message: 'Authorization error', details: error.message });
    }
};

