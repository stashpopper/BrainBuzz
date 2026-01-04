const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brainbuzzsignup',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: null
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: null
  },
  answers: [{
    questionIndex: Number,
    selectedAnswer: String,
    isCorrect: Boolean,
    timeTaken: Number
  }],
  isFinished: {
    type: Boolean,
    default: false
  }
});

const quizRoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomName: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brainbuzzsignup',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  categories: [{
    type: String,
    required: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  questionCount: {
    type: Number,
    default: 10,
    min: 5,
    max: 50
  },
  optionsCount: {
    type: Number,
    default: 4,
    min: 2,
    max: 6
  },
  timePerQuestion: {
    type: Number,
    default: 30,
    min: 10,
    max: 120
  },
  maxParticipants: {
    type: Number,
    default: 100,
    max: 100
  },
  participants: [participantSchema],
  quiz: {
    questions: [{
      question: String,
      options: [String],
      correct_answer: String
    }],
    isGenerated: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  startedAt: {
    type: Date,
    default: null
  },
  finishedAt: {    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Generate unique room code
quizRoomSchema.methods.generateRoomCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Get leaderboard sorted by score and completion time
quizRoomSchema.methods.getLeaderboard = function() {
  return this.participants
    .filter(p => p.isFinished)
    .sort((a, b) => {
      // First sort by score (highest first)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If scores are equal, sort by completion time (fastest first)
      return new Date(a.completedAt) - new Date(b.completedAt);
    })
    .map((participant, index) => ({
      rank: index + 1,
      userId: participant.userId,
      username: participant.username,
      score: participant.score,
      correctAnswers: participant.correctAnswers,
      totalQuestions: participant.totalQuestions,
      completedAt: participant.completedAt,
      timeTaken: participant.completedAt ? 
        Math.round((new Date(participant.completedAt) - new Date(this.startedAt)) / 1000) : null
    }));
};

// Check if user can join room
quizRoomSchema.methods.canJoin = function(userId) {
  if (this.status === 'finished') return false;
  if (this.participants.length >= this.maxParticipants) return false;
  if (this.participants.some(p => p.userId.toString() === userId.toString())) return false;
  return true;
};

module.exports = mongoose.model('QuizRoom', quizRoomSchema);
