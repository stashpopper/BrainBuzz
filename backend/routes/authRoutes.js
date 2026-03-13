const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// User model will be passed in during initialization
let User;

/**
 * Initialize the router with the User model
 * @param {mongoose.Model} userModel - The User mongoose model
 */
function initializeAuthRoutes(userModel) {
    User = userModel;
    return router;
}

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "24h" });
        res.json({
            token,
            name: user.name,
            id: user._id,
            email: user.email
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: "Server error during signup" });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "24h" });
        res.json({
            token,
            name: user.name,
            id: user._id,
            email: user.email
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Server error during login" });
    }
});

// Generate invite code
router.get('/invitecode', (req, res) => {
    const generateInviteCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }
        return code;
    };

    const inviteCode = generateInviteCode();
    res.json({ inviteCode });
});

module.exports = { router, initializeAuthRoutes };
