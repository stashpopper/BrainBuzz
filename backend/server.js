require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express app and server
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: ['https://buzzingneurons.netlify.app', 'https://thebrainbuzz.netlify.app', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['https://buzzingneurons.netlify.app', 'https://thebrainbuzz.netlify.app', 'http://localhost:3000', 'http://localhost:5173'],
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

// User schema and model (defined here for compatibility with existing data)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
});

const User = mongoose.model("brainbuzzsignup", UserSchema);

// Import route modules
const { initializeAuthRoutes } = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const { initializeQuizRoomRoutes } = require('./routes/quizRoomRoutes');
const { initializeDocumentRoutes } = require('./routes/documentRoutes');

// Import socket handlers
const { initializeSocketHandlers } = require('./socketHandlers/quizRoomHandler');

// Initialize routes with dependencies
const authRoutes = initializeAuthRoutes(User);
const quizRoomRoutes = initializeQuizRoomRoutes(User, io);
const documentRoutes = initializeDocumentRoutes(io);

// Mount routes
app.use('/', authRoutes);                    // /signup, /login, /invitecode
app.use('/quiz', quizRoutes);                // /quiz CRUD routes
app.use('/quiz-room', quizRoomRoutes);       // /quiz-room routes
app.use('/document', documentRoutes);         // /document routes (new)

// My quizzes route at root level (for backward compatibility)
const { authenticateToken } = require('./middleware/auth');
const Quiz = require('./models/quiz');

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

// My documents route at root level (for convenience)
const Document = require('./models/document');

app.get('/my-documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('documentId originalName status pageCount chunkCount topicsExtracted createdAt');
    res.json(documents);
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BrainBuzz API is running' });
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Define port for the server
const PORT = process.env.PORT || 5001;

// Always start the server (production server.listen was previously skipped - fixed)
const serverInstance = server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  serverInstance.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  serverInstance.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Export the app for testing purposes
module.exports = app;
