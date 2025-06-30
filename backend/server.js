require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Quiz = require('./models/quiz');
const QuizRoom = require('./models/quizRoom');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: ['https://thebrainbuzz.netlify.app', 'http://localhost:3000', 'http://localhost:5173', 'https://brainbuzz-dram.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());

// CORS configuration for both development and production
app.use(cors({
  origin: ['https://thebrainbuzz.netlify.app', 'http://localhost:3000', 'http://localhost:5173', 'https://brainbuzz-dram.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const url = 'https://brainbuzz-dram.onrender.com';
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error('Error');
    });
}

setInterval(reloadWebsite, interval);

// AI Quiz Generation Configuration
const API_KEY = "w9MCe67fIaMN4PT4koycxNt6ae50XVXG";
const API_URL = "https://api.mistral.ai/v1/chat/completions";

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

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "24h" });    res.json({ 
        token, 
        name: user.name, 
        id: user._id,
        email: user.email 
    });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
    }    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({
        token, 
        name: user.name, 
        id: user._id,
        email: user.email 
    });
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

// Quiz Room Routes
app.post('/quiz-room', authenticateToken, async (req, res) => {
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
    }    const quizRoom = new QuizRoom({
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

    await quizRoom.save();    console.log('Room created with creator as participant:', {
      roomCode: quizRoom.roomCode,
      creatorId: req.user.id,
      creatorName: user.name,
      participantCount: quizRoom.participants.length,
      participants: quizRoom.participants.map(p => ({ userId: p.userId, username: p.username }))
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
app.post('/quiz-room/:roomCode/join', authenticateToken, async (req, res) => {
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
    });    await room.save();

    // Emit room update to all participants
    io.to(roomCode).emit('participantJoined', {
      participants: room.participants.map(p => ({ 
        username: p.username, 
        isFinished: p.isFinished,
        userId: p.userId 
      })),
      totalParticipants: room.participants.length
    });

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
app.get('/quiz-room/:roomCode', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await QuizRoom.findOne({ roomCode }).populate('createdBy', 'name');
      if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    console.log('GET room data:', {
      roomCode,
      participantCount: room.participants.length,
      participants: room.participants.map(p => ({ userId: p.userId, username: p.username }))
    });

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
      status: room.status,      participants: room.participants.map(p => ({
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
app.post('/quiz-room/:roomCode/start', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await QuizRoom.findOne({ roomCode });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only room creator can start the quiz' });
    }    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Quiz has already started or finished' });
    }

    // First, notify all participants that quiz generation is starting
    io.to(roomCode).emit('quizGenerating', {
      message: 'Quiz is being generated, please wait...'
    });

    // Generate AI quiz if not already generated
    if (!room.quiz.isGenerated) {
      let questions;
        try {
        // Try to generate with AI first
        const categoryString = room.categories.join(", ");
        const prompt = `
          Generate a ${room.difficulty} level multiple-choice quiz with ${room.questionCount} questions.
          Each question should have ${room.optionsCount} answer options.
          The quiz should be based on these categories: ${categoryString}.
          Questions should be non-repetitive and cover a wide range of topics within the categories.
          Provide a JSON response with "question", "options", and "correct_answer" fields, without extra text.
        `;

        console.log('Generating quiz with AI...');
        io.to(roomCode).emit('quizGenerating', {
          message: 'Generating questions with AI...'
        });

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
        }        const jsonContent = rawContent.substring(startIdx, endIdx + 1);
        questions = JSON.parse(jsonContent);
        
        console.log('AI quiz generated successfully');
        io.to(roomCode).emit('quizGenerating', {
          message: 'AI quiz generated! Starting quiz...'
        });
        
      } catch (error) {
        // If AI fails, use fallback questions
        console.warn('AI API failed, using fallback questions:', error.message);
        io.to(roomCode).emit('quizGenerating', {
          message: 'AI unavailable, using backup questions...'
        });
        questions = getFallbackQuestions(room.difficulty, room.questionCount);
      }

      room.quiz.questions = questions;
      room.quiz.isGenerated = true;
    }

    room.status = 'active';
    room.startedAt = new Date();
    await room.save();    // Emit quiz start to all participants with the actual quiz
    console.log('Emitting quizStarted to room:', roomCode);
    console.log('Quiz questions count:', room.quiz.questions.length);
    io.to(roomCode).emit('quizStarted', {
      quiz: room.quiz.questions,
      timePerQuestion: room.timePerQuestion
    });

    res.json({ 
      message: 'Quiz started successfully',
      quiz: room.quiz.questions,
      timePerQuestion: room.timePerQuestion
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    
    // Notify participants of error
    io.to(req.params.roomCode).emit('quizError', {
      message: 'Failed to start quiz. Please try again.'
    });
    
    res.status(500).json({ error: 'Server error while starting quiz' });
  }
});

// Submit quiz answers
app.post('/quiz-room/:roomCode/submit', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { answers } = req.body;
    
    console.log('Quiz submission received:', {
      roomCode,
      userId: req.user.id,
      answersType: typeof answers,
      answersLength: Array.isArray(answers) ? answers.length : 'not array',
      answers: answers
    });
    
    // Validate answers format
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

    // Validate answers length matches questions
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
    io.to(roomCode).emit('leaderboardUpdate', { leaderboard });

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

// Fallback quiz questions when AI API is unavailable
function getFallbackQuestions(difficulty = 'medium', count = 5) {
  const easy = [
    {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct_answer: "Paris"
    },
    {
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct_answer: "Mars"
    },
    {
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct_answer: "4"
    },
    {
      question: "What is the largest ocean on Earth?",
      options: ["Atlantic", "Indian", "Arctic", "Pacific"],
      correct_answer: "Pacific"
    },
    {
      question: "How many days are in a leap year?",
      options: ["365", "366", "367", "364"],
      correct_answer: "366"
    }
  ];

  const medium = [
    {
      question: "Which element has the chemical symbol 'O'?",
      options: ["Gold", "Oxygen", "Silver", "Iron"],
      correct_answer: "Oxygen"
    },
    {
      question: "In which year did World War II end?",
      options: ["1944", "1945", "1946", "1947"],
      correct_answer: "1945"
    },
    {
      question: "What is the square root of 64?",
      options: ["6", "7", "8", "9"],
      correct_answer: "8"
    },
    {
      question: "Which organ in the human body produces insulin?",
      options: ["Liver", "Kidney", "Pancreas", "Heart"],
      correct_answer: "Pancreas"
    },
    {
      question: "What is the currency of Japan?",
      options: ["Yuan", "Won", "Yen", "Rupee"],
      correct_answer: "Yen"
    }
  ];

  const hard = [
    {
      question: "What is the smallest prime number?",
      options: ["0", "1", "2", "3"],
      correct_answer: "2"
    },
    {
      question: "Which scientist developed the theory of relativity?",
      options: ["Newton", "Einstein", "Galileo", "Darwin"],
      correct_answer: "Einstein"
    },
    {
      question: "What is the chemical formula for water?",
      options: ["H2O", "CO2", "NaCl", "CH4"],
      correct_answer: "H2O"
    },
    {
      question: "In which continent is the Sahara Desert located?",
      options: ["Asia", "Australia", "Africa", "South America"],
      correct_answer: "Africa"
    },
    {
      question: "What is the hardest natural substance on Earth?",
      options: ["Gold", "Iron", "Diamond", "Platinum"],
      correct_answer: "Diamond"
    }
  ];

  let questions;
  switch (difficulty.toLowerCase()) {
    case 'easy':
      questions = easy;
      break;
    case 'hard':
      questions = hard;
      break;
    default:
      questions = medium;
  }

  // Return the requested number of questions (shuffle and take count)  const shuffled = questions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to remove participant from room
const removeParticipantFromRoom = async (roomCode, userId) => {
  try {
    const room = await QuizRoom.findOne({ roomCode });
    
    if (!room) return;
    
    // Remove participant from the room
    const initialCount = room.participants.length;
    room.participants = room.participants.filter(p => p.userId.toString() !== userId.toString());
    
    // Only save if participant was actually removed
    if (room.participants.length < initialCount) {
      await room.save();
      console.log(`Removed participant ${userId} from room ${roomCode}. Remaining: ${room.participants.length}`);
      
      // Emit updated participant list to remaining participants
      io.to(roomCode).emit('participantLeft', {
        participants: room.participants.map(p => ({ 
          username: p.username, 
          isFinished: p.isFinished,
          userId: p.userId 
        })),
        totalParticipants: room.participants.length
      });
    }
  } catch (error) {
    console.error('Error removing participant from room:', error);
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);  // Join quiz room
  socket.on('joinRoom', async (data) => {
    try {
      const { roomCode, userId } = data;
      console.log('User joining room:', roomCode, 'userId:', userId);
      
      // Store user data in socket for cleanup on disconnect
      socket.userId = userId;
      socket.currentRoom = roomCode;
      
      // Join the room
      socket.join(roomCode);
      console.log('User', socket.id, 'joined room:', roomCode);
      
      const room = await QuizRoom.findOne({ roomCode });
      if (room) {        // If quiz is already active, send current quiz state
        if (room.status === 'active') {
          socket.emit('roomJoined', {
            roomCode,
            participants: room.participants.map(p => ({ 
              username: p.username, 
              isFinished: p.isFinished,
              userId: p.userId,
              score: p.score 
            })),
            status: room.status,
            quiz: room.quiz.questions,
            timePerQuestion: room.timePerQuestion,
            totalParticipants: room.participants.length
          });
          
          // Also emit quiz started event for consistency
          socket.emit('quizStarted', {
            quiz: room.quiz.questions,
            timePerQuestion: room.timePerQuestion
          });        } else {
          socket.emit('roomJoined', {
            roomCode,
            participants: room.participants.map(p => ({ 
              username: p.username, 
              isFinished: p.isFinished,
              userId: p.userId,
              score: p.score 
            })),
            status: room.status,
            totalParticipants: room.participants.length
          });
        }
          // Notify other participants about the new joiner
        socket.broadcast.to(roomCode).emit('participantJoined', {
          participants: room.participants.map(p => ({ 
            username: p.username, 
            isFinished: p.isFinished,
            userId: p.userId,
            score: p.score 
          })),
          totalParticipants: room.participants.length
        });
      } else {
        socket.emit('error', 'Room not found');
      }
    } catch (error) {
      console.error('Socket joinRoom error:', error);
      socket.emit('error', 'Failed to join room');
    }
  });
  // Leave room
  socket.on('leaveRoom', async (data) => {
    const { roomCode, userId } = data;
    socket.leave(roomCode);
    
    // Remove participant from room and cleanup if needed
    if (userId) {
      await removeParticipantFromRoom(roomCode, userId);
    }
  });
  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Get user data from socket if available
    if (socket.userId && socket.currentRoom) {
      await removeParticipantFromRoom(socket.currentRoom, socket.userId);
    }
  });
});

// Define port for the server
const PORT = process.env.PORT || 5001;

// Start the server (always start for Render, only skip for Vercel)
if (process.env.VERCEL !== '1') {
    const serverInstance = server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        serverInstance.close(() => {
            console.log('Process terminated');
        });
    });

    process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        serverInstance.close(() => {
            console.log('Process terminated');
        });
    });
} else {
    console.log('Running in Vercel serverless environment');
}

// Export the app for serverless environments (Vercel)
module.exports = app;
