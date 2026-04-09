const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT and check user status
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to request
        req.user = decoded;

        // Note: You should ideally fetch the latest status from DB here 
        // to ensure the user wasn't suspended since the token was issued.
        // For now, we'll assume the controller handles fresh DB checks for sensitive actions.
        
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles 
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = (req.user.role || '').toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: `User role ${req.user.role} is not authorized to access this route` 
            });
        }
        next();
    };
};

/**
 * Middleware to verify JWT if present, but allow guests
 */
const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        // Even if token fails, allowed for guest actions
        next();
    }
};

module.exports = { protect, authorize, optionalProtect };
