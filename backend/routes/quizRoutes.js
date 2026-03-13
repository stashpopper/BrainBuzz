const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz');
const { authenticateToken } = require('../middleware/auth');

// Create quiz (authenticated)
router.post('/', authenticateToken, async (req, res) => {
    try {
        let { quizName, questions, categories, optionsCount, questionCount, difficulty, timePerQuestion } = req.body;
        const createdBy = req.user.id;

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

        if (!categories || categories.length === 0) {
            return res.status(400).json({
                error: "Invalid request data",
                details: "Category is required"
            });
        }

        // Handle duplicate quiz names
        const existingQuiz = await Quiz.findOne({ quizName });
        if (existingQuiz) {
            const timestamp = new Date().getTime();
            quizName = `${quizName}_${timestamp}`;
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
            createdBy
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

// Get all quizzes (public)
router.get('/', async (req, res) => {
    try {
        const quizzes = await Quiz.find();
        res.json(quizzes);
    } catch (error) {
        console.error("Error fetching all quizzes:", error);
        res.status(500).json({ error: "Server error while fetching all quizzes" });
    }
});

// Get user's quizzes (authenticated)
router.get('/my-quizzes', authenticateToken, async (req, res) => {
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

// Get quiz by ID (public)
router.get('/:id', async (req, res) => {
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

// Delete quiz (authenticated, creator only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user.id;

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        if (quiz.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Forbidden: You are not authorized to delete this quiz" });
        }

        await Quiz.findByIdAndDelete(quizId);
        res.json({ message: "Quiz deleted successfully" });

    } catch (error) {
        console.error("Error deleting quiz:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: "Invalid quiz ID format" });
        }
        res.status(500).json({ error: "Server error while deleting quiz" });
    }
});

module.exports = router;
