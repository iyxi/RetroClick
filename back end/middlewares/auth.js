const jwt = require("jsonwebtoken");

exports.isAuthenticatedUser = (req, res, next) => {
    const auth = req.header('Authorization') || req.header('authorization');
    if (!auth) return res.status(401).json({ message: 'Login first to access this resource' });

    const parts = auth.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];

    if (!token) return res.status(401).json({ message: 'Login first to access this resource' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        if (decoded.role) req.user.role = decoded.role;
        req.body = req.body || {};
        req.body.user = { id: decoded.id };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Generic role requirement middleware. `roles` can be a string or an array of allowed roles.
exports.requireRole = (roles) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return async (req, res, next) => {
        try {
            // Prefer role provided by token to avoid DB lookup
            const tokenRole = req.user?.role;
            if (tokenRole) {
                if (!allowed.includes(tokenRole)) return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
                return next();
            }

            const db = require('../models');
            if (!db || !db.User) return res.status(500).json({ message: 'Authorization error', details: 'User model not initialized' });

            const userId = req.user?.id || req.body?.user?.id;
            if (!userId) return res.status(401).json({ message: 'Login first to access this resource' });

            const User = db.User;
            const user = await User.findOne({ where: { id: userId } });
            if (!user) return res.status(404).json({ message: 'User not found' });

            if (!allowed.includes(user.role)) {
                return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
            }

            // attach full user object for downstream handlers
            req.user = req.user || {};
            req.user.role = user.role;
            next();
        } catch (error) {
            console.error('requireRole middleware error:', error);
            return res.status(500).json({ message: 'Authorization error', details: error.message });
        }
    };
};

// Backwards-compatible convenience middlewares
exports.isAdmin = exports.requireRole('admin');
exports.isManager = exports.requireRole(['manager', 'admin']);

