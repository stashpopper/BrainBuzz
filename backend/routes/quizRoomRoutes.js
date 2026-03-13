const express = require('express');
const router = express.Router();
const axios = require('axios');
const QuizRoom = require('../models/quizRoom');
const { authenticateToken } = require('../middleware/auth');

// Configuration
const API_KEY = "w9MCe67fIaMN4PT4koycxNt6ae50XVXG";
const API_URL = "https://api.mistral.ai/v1/chat/completions";

// User model will be passed in during initialization
let User;
let io;

/**
 * Initialize the router with User model and Socket.IO instance
 */
function initializeQuizRoomRoutes(userModel, socketIO) {
    User = userModel;
    io = socketIO;
    return router;
}

// Fallback quiz questions when AI API is unavailable
function getFallbackQuestions(difficulty = 'medium', count = 5) {
    const easy = [
        { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct_answer: "Paris" },
        { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct_answer: "Mars" },
        { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correct_answer: "4" },
        { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct_answer: "Pacific" },
        { question: "How many days are in a leap year?", options: ["365", "366", "367", "364"], correct_answer: "366" }
    ];

    const medium = [
        { question: "Which element has the chemical symbol 'O'?", options: ["Gold", "Oxygen", "Silver", "Iron"], correct_answer: "Oxygen" },
        { question: "In which year did World War II end?", options: ["1944", "1945", "1946", "1947"], correct_answer: "1945" },
        { question: "What is the square root of 64?", options: ["6", "7", "8", "9"], correct_answer: "8" },
        { question: "Which organ in the human body produces insulin?", options: ["Liver", "Kidney", "Pancreas", "Heart"], correct_answer: "Pancreas" },
        { question: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Rupee"], correct_answer: "Yen" }
    ];

    const hard = [
        { question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correct_answer: "2" },
        { question: "Which scientist developed the theory of relativity?", options: ["Newton", "Einstein", "Galileo", "Darwin"], correct_answer: "Einstein" },
        { question: "What is the chemical formula for water?", options: ["H2O", "CO2", "NaCl", "CH4"], correct_answer: "H2O" },
        { question: "In which continent is the Sahara Desert located?", options: ["Asia", "Australia", "Africa", "South America"], correct_answer: "Africa" },
        { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correct_answer: "Diamond" }
    ];

    let questions;
    switch (difficulty.toLowerCase()) {
        case 'easy': questions = easy; break;
        case 'hard': questions = hard; break;
        default: questions = medium;
    }

    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Create quiz room
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { roomName, categories, difficulty, questionCount, optionsCount, timePerQuestion, maxParticipants } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate unique room code
        let roomCode;
        let codeExists = true;
        while (codeExists) {
            roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existingRoom = await QuizRoom.findOne({ roomCode });
            codeExists = !!existingRoom;
        }

        const quizRoom = new QuizRoom({
            roomCode,
            roomName,
            createdBy: req.user.id,
            creatorName: user.name,
            categories,
            difficulty: difficulty || 'medium',
            questionCount: questionCount || 10,
            optionsCount: optionsCount || 4,
            timePerQuestion: timePerQuestion || 30,
            maxParticipants: Math.min(maxParticipants || 100, 100),
            participants: [{
                userId: req.user.id,
                username: user.name,
                joinedAt: new Date(),
                isFinished: false,
                score: 0,
                correctAnswers: 0,
                totalQuestions: 0
            }]
        });

        await quizRoom.save();

        console.log('Room created with creator as participant:', {
            roomCode: quizRoom.roomCode,
            creatorId: req.user.id,
            creatorName: user.name,
            participantCount: quizRoom.participants.length
        });

        res.status(201).json({
            message: 'Quiz room created successfully',
            room: {
                roomCode: quizRoom.roomCode,
                roomName: quizRoom.roomName,
                categories: quizRoom.categories,
                difficulty: quizRoom.difficulty,
                questionCount: quizRoom.questionCount,
                maxParticipants: quizRoom.maxParticipants
            }
        });
    } catch (error) {
        console.error('Error creating quiz room:', error);
        res.status(500).json({ error: 'Server error while creating quiz room' });
    }
});

// Join quiz room
router.post('/:roomCode/join', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const room = await QuizRoom.findOne({ roomCode });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (!room.canJoin(req.user.id)) {
            return res.status(400).json({ error: 'Cannot join room' });
        }

        room.participants.push({
            userId: req.user.id,
            username: user.name
        });
        await room.save();

        // Emit room update to all participants
        if (io) {
            io.to(roomCode).emit('participantJoined', {
                participants: room.participants.map(p => ({
                    username: p.username,
                    isFinished: p.isFinished,
                    userId: p.userId
                })),
                totalParticipants: room.participants.length
            });
        }

        res.json({
            message: 'Successfully joined room',
            room: {
                roomCode: room.roomCode,
                roomName: room.roomName,
                status: room.status,
                participants: room.participants.map(p => ({ username: p.username, isFinished: p.isFinished }))
            }
        });
    } catch (error) {
        console.error('Error joining quiz room:', error);
        res.status(500).json({ error: 'Server error while joining room' });
    }
});

// Get quiz room details
router.get('/:roomCode', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await QuizRoom.findOne({ roomCode }).populate('createdBy', 'name');

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            roomCode: room.roomCode,
            roomName: room.roomName,
            creatorName: room.creatorName,
            createdBy: room.createdBy._id,
            categories: room.categories,
            difficulty: room.difficulty,
            questionCount: room.questionCount,
            optionsCount: room.optionsCount,
            timePerQuestion: room.timePerQuestion,
            maxParticipants: room.maxParticipants,
            status: room.status,
            participants: room.participants.map(p => ({
                username: p.username,
                isFinished: p.isFinished,
                userId: p.userId,
                score: p.score
            })),
            quiz: room.quiz,
            leaderboard: room.getLeaderboard()
        });
    } catch (error) {
        console.error('Error fetching quiz room:', error);
        res.status(500).json({ error: 'Server error while fetching room' });
    }
});

// Start quiz in room
router.post('/:roomCode/start', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await QuizRoom.findOne({ roomCode });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (room.createdBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: 'Only room creator can start the quiz' });
        }

        if (room.status !== 'waiting') {
            return res.status(400).json({ error: 'Quiz has already started or finished' });
        }

        // First, notify all participants that quiz generation is starting
        if (io) {
            io.to(roomCode).emit('quizGenerating', {
                message: 'Quiz is being generated, please wait...'
            });
        }

        // Generate AI quiz if not already generated
        if (!room.quiz.isGenerated) {
            let questions;

            try {
                const categoryString = room.categories.join(", ");
                const prompt = `
          Generate a ${room.difficulty} level multiple-choice quiz with ${room.questionCount} questions.
          Each question should have ${room.optionsCount} answer options.
          The quiz should be based on these categories: ${categoryString}.
          Questions should be non-repetitive and cover a wide range of topics within the categories.
          Provide a JSON response with "question", "options", and "correct_answer" fields, without extra text.
        `;

                console.log('Generating quiz with AI...');
                if (io) {
                    io.to(roomCode).emit('quizGenerating', {
                        message: 'Generating questions with AI...'
                    });
                }

                const response = await axios.post(
                    API_URL,
                    {
                        model: "mistral-large-2411",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${API_KEY}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                let rawContent = response.data.choices[0]?.message?.content?.trim();
                if (!rawContent) {
                    throw new Error('Failed to generate quiz content');
                }

                const startIdx = rawContent.indexOf("[");
                const endIdx = rawContent.lastIndexOf("]");
                if (startIdx === -1 || endIdx === -1) {
                    throw new Error('Invalid quiz format received');
                }

                const jsonContent = rawContent.substring(startIdx, endIdx + 1);
                questions = JSON.parse(jsonContent);

                console.log('AI quiz generated successfully');
                if (io) {
                    io.to(roomCode).emit('quizGenerating', {
                        message: 'AI quiz generated! Starting quiz...'
                    });
                }

            } catch (error) {
                console.warn('AI API failed, using fallback questions:', error.message);
                if (io) {
                    io.to(roomCode).emit('quizGenerating', {
                        message: 'AI unavailable, using backup questions...'
                    });
                }
                questions = getFallbackQuestions(room.difficulty, room.questionCount);
            }

            room.quiz.questions = questions;
            room.quiz.isGenerated = true;
        }

        room.status = 'active';
        room.startedAt = new Date();
        await room.save();

        // Emit quiz start to all participants with the actual quiz
        console.log('Emitting quizStarted to room:', roomCode);
        if (io) {
            io.to(roomCode).emit('quizStarted', {
                quiz: room.quiz.questions,
                timePerQuestion: room.timePerQuestion
            });
        }

        res.json({
            message: 'Quiz started successfully',
            quiz: room.quiz.questions,
            timePerQuestion: room.timePerQuestion
        });
    } catch (error) {
        console.error('Error starting quiz:', error);

        if (io) {
            io.to(req.params.roomCode).emit('quizError', {
                message: 'Failed to start quiz. Please try again.'
            });
        }

        res.status(500).json({ error: 'Server error while starting quiz' });
    }
});

// Submit quiz answers
router.post('/:roomCode/submit', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { answers } = req.body;

        console.log('Quiz submission received:', {
            roomCode,
            userId: req.user.id,
            answersLength: Array.isArray(answers) ? answers.length : 'not array'
        });

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Answers must be an array' });
        }

        const room = await QuizRoom.findOne({ roomCode });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (!room.quiz.isGenerated || !room.quiz.questions || room.quiz.questions.length === 0) {
            return res.status(400).json({ error: 'Quiz not ready or questions not available' });
        }

        const participant = room.participants.find(p => p.userId.toString() === req.user.id.toString());
        if (!participant) {
            return res.status(400).json({ error: 'Not a participant in this room' });
        }

        if (participant.isFinished) {
            return res.status(400).json({ error: 'Already submitted answers' });
        }

        if (answers.length !== room.quiz.questions.length) {
            return res.status(400).json({
                error: `Expected ${room.quiz.questions.length} answers, got ${answers.length}`
            });
        }

        // Calculate score
        let correctCount = 0;
        const userAnswers = [];

        room.quiz.questions.forEach((q, i) => {
            const isCorrect = answers[i] === q.correct_answer;
            if (isCorrect) {
                correctCount++;
            }

            userAnswers.push({
                questionIndex: i,
                selectedAnswer: answers[i] || "No answer",
                isCorrect
            });
        });

        const score = Math.round((correctCount / room.quiz.questions.length) * 100);

        // Update participant
        participant.score = score;
        participant.correctAnswers = correctCount;
        participant.totalQuestions = room.quiz.questions.length;
        participant.answers = userAnswers;
        participant.isFinished = true;
        participant.completedAt = new Date();

        await room.save();

        // Emit leaderboard update
        const leaderboard = room.getLeaderboard();
        if (io) {
            io.to(roomCode).emit('leaderboardUpdate', { leaderboard });
        }

        res.json({
            message: 'Answers submitted successfully',
            score,
            correctAnswers: correctCount,
            totalQuestions: room.quiz.questions.length,
            leaderboard
        });
    } catch (error) {
        console.error('Error submitting quiz answers:', error);
        res.status(500).json({ error: 'Server error while submitting answers' });
    }
});

module.exports = { router, initializeQuizRoomRoutes };
