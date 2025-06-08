require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Quiz = require('./models/quiz');

const app = express();
app.use(express.json());

// CORS configuration for both development and production
app.use(cors({
  origin: ['https://thebrainbuzz.netlify.app', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// User schema and model
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const User = mongoose.model("brainbuzzsignup", UserSchema);

// Middleware for JWT Authentication
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find user by email decoded from token and attach user ID to request
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
             // Return 401 if user associated with token not found
            return res.status(401).json({ message: "User associated with token not found" });
        }
        req.user = { id: user._id }; // Attach user ID to the request object
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err);
         // Return 401 if token verification fails (e.g., expired, invalid)
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};


// Routes
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, name: user.name });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, name: user.name });
});

app.get('/invitecode', (req, res) => {
    const generateInviteCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }
        return code;

    }
    const inviteCode = generateInviteCode();
    res.json({ inviteCode });

});

// Apply authentication middleware to quiz creation route
app.post("/quiz", authenticateToken, async (req, res) => {
    try {
        let { quizName, questions, categories, optionsCount, questionCount, difficulty, timePerQuestion } = req.body; // Use let for quizName
        const createdBy = req.user.id; // Get user ID from authenticated request

        // Validate required fields
        if (!quizName || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ 
                error: "Invalid request data",
                details: "quizName and questions array are required"
            });
        }

        // Validate each question
        for (const q of questions) {
            if (!q.question || !Array.isArray(q.options) || !q.correct_answer) {
                return res.status(400).json({
                    error: "Invalid question format",
                    details: "Each question must have question, options array, and correct_answer"
                });
            }
        }
        if (!quizName || !questions || !Array.isArray(questions) || !categories) {
            return res.status(400).json({ 
                error: "Invalid request data",
                details: "quizName, category, and questions array are required"
            });
        }

        if (categories === null || categories.length === 0) {
            return res.status(400).json({ 
                error: "Invalid request data",
                details: "Category is required"
            });
        }

        // Handle duplicate quiz names
        try {
            const existingQuiz = await Quiz.findOne({ quizName });
            if (existingQuiz) {
                // Append timestamp to make unique
                const timestamp = new Date().getTime();
                quizName = `${quizName}`;
            }
        } catch (err) {
            console.error("Error checking for existing quiz:", err);
        }

        // Create and save quiz
        const quiz = new Quiz({
            quizName,
            questions,
            categories,
            optionsCount,
            questionCount,
            difficulty,
            timePerQuestion,
            createdBy // Add the creator's ID
        });

        await quiz.save();

        res.status(201).json({ 
            message: "Quiz created successfully", 
            quiz: { quizName: quiz.quizName } 
        });
    } catch (error) {
        console.error("Error saving quiz:", error);
        res.status(500).json({ 
            error: "Server error while saving quiz",
            details: error.message 
        });
    }
});

// This route should be public - remove authenticateToken middleware
app.get('/quiz', async (req, res) => { 
    try {
        const quizzes = await Quiz.find();
        res.json(quizzes);
    } catch (error) {
        console.error("Error fetching all quizzes:", error);
        res.status(500).json({ error: "Server error while fetching all quizzes" });
    }
});

// New route to get quizzes created by the logged-in user
app.get('/my-quizzes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const quizzes = await Quiz.find({ createdBy: userId });

        if (!quizzes || quizzes.length === 0) {
            return res.status(404).json({ message: "No quizzes found for this user." });
        }

        res.json(quizzes);
    } catch (error) {
        console.error("Error fetching user's quizzes:", error);
        res.status(500).json({ error: "Server error while fetching quizzes" });
    }
});

// Add route to delete a specific quiz by ID (only by creator)
app.delete('/quiz/:id', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user.id;

        // Find the quiz first to check ownership
        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        // Check if the logged-in user is the creator
        // Convert both IDs to strings for comparison to avoid ObjectId comparison issues
        if (quiz.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Forbidden: You are not authorized to delete this quiz" });
        }

        // If authorized, delete the quiz
        await Quiz.findByIdAndDelete(quizId);

        res.json({ message: "Quiz deleted successfully" });

    } catch (error) {
        console.error("Error deleting quiz:", error);
        // Handle potential CastError if ID format is invalid
        if (error.name === 'CastError') {
             return res.status(400).json({ error: "Invalid quiz ID format" });
        }
        res.status(500).json({ error: "Server error while deleting quiz" });
    }
});


// Add a route to get a specific quiz by ID
app.get('/quiz/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }
        res.json(quiz);
    } catch (error) {
        console.error("Error fetching quiz by ID:", error);
        res.status(500).json({ error: "Server error while fetching quiz" });
    }
});

// Add a health check route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'BrainBuzz API is running' });
});

// Define port for the server
const PORT = process.env.PORT || 5000;

// Start the server only if not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export the app for serverless environments (Vercel)
module.exports = app;
