const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Get User model - import dynamically to avoid circular dependencies
const getUserModel = () => {
    return mongoose.model('brainbuzzsignup');
};

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user ID to request
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = getUserModel();
        const user = await User.findOne({ email: decoded.email });

        if (!user) {
            return res.status(401).json({ message: "User associated with token not found" });
        }

        req.user = { id: user._id };
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = { authenticateToken };
