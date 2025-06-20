# Quiz Room Setup Guide

## What I've Created

I've successfully implemented a comprehensive multiplayer quiz room feature for your BrainBuzz application with the following components:

### Backend Components:
1. **QuizRoom Model** (`backend/models/quizRoom.js`) - Stores room data, participants, and leaderboards
2. **Socket.IO Integration** - Real-time communication for live updates
3. **Quiz Room API Endpoints**:
   - `POST /quiz-room` - Create a new quiz room
   - `POST /quiz-room/:roomCode/join` - Join a room
   - `GET /quiz-room/:roomCode` - Get room details
   - `POST /quiz-room/:roomCode/start` - Start the quiz (creator only)
   - `POST /quiz-room/:roomCode/submit` - Submit quiz answers
   - `GET /quiz-rooms` - List public rooms

### Frontend Components:
1. **CreateQuizRoom** (`frontend/src/components/CreateQuizRoom.jsx`) - Create new rooms
2. **QuizRooms** (`frontend/src/pages/QuizRooms.jsx`) - Browse and join rooms
3. **QuizRoom** (`frontend/src/pages/QuizRoom.jsx`) - Room lobby and management
4. **MultiplexQuiz** (`frontend/src/components/MultiplexQuiz.jsx`) - Multiplayer quiz interface
5. **Leaderboard** (`frontend/src/components/Leaderboard.jsx`) - Real-time leaderboard
6. **Socket Service** (`frontend/src/services/socketService.js`) - WebSocket communication

## Features Implemented:

### 🏆 Core Features:
- **Up to 100 participants** per room
- **Real-time multiplayer** quiz experience
- **AI-generated quizzes** based on selected categories
- **Live leaderboard** updates as participants finish
- **Room codes** for easy joining (6-character codes)
- **Public/Private rooms** option

### 🎯 Quiz Room Features:
- **Room Creator Controls**: Only creators can start quizzes
- **Participant Management**: Real-time participant list with join notifications
- **Category Selection**: Multiple categories from 25+ options
- **Difficulty Levels**: Easy, Medium, Hard
- **Customizable Settings**: Question count, time per question, options per question
- **Join Methods**: Browse public rooms or join by room code

### 📊 Leaderboard Features:
- **Real-time updates** as participants complete quizzes
- **Ranking system** based on score and completion time
- **Visual indicators** for top 3 performers (🥇🥈🥉)
- **Statistics display**: Average score, top score, completion count
- **Color-coded scores**: Green (90+%), Yellow (70+%), Orange (50+%), Red (<50%)

### 🔄 Real-time Features:
- **Live participant updates** when users join/leave
- **Quiz start notifications** to all participants
- **Instant leaderboard updates** when someone finishes
- **WebSocket communication** for seamless real-time experience

## How to Test:

### 1. Start the Application:
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### 2. Create and Test Quiz Rooms:
1. **Sign up/Login** to the application
2. **Navigate to "Quiz Rooms"** in the navigation
3. **Click "Create New Room"**
4. **Configure your room**:
   - Room name (e.g., "Science Challenge")
   - Categories (select multiple from 25+ options)
   - Difficulty level
   - Number of questions (5-50)
   - Time per question (10-120 seconds)
   - Max participants (2-100)

### 3. Test Multiplayer Functionality:
1. **Create a room** with User 1
2. **Copy the room code** (6-character code)
3. **Open another browser/incognito window**
4. **Sign up/Login** with User 2
5. **Join the room** using the room code
6. **Start the quiz** as the room creator (User 1)
7. **Both users take the quiz** simultaneously
8. **Watch the leaderboard** update in real-time

### 4. Test Real-time Features:
- **Participant joining**: Watch the participant count update live
- **Quiz start**: All participants get notified instantly
- **Leaderboard updates**: See rankings change as people finish
- **Leave/rejoin**: Test connection stability

## Navigation:
- **Home** → **Quiz Rooms** → **Create New Room** or **Join Room**
- **Room Code**: 6-character codes (e.g., "ABC123")
- **Public Rooms**: Visible in the rooms list
- **Private Rooms**: Only accessible via room code

## Technical Details:
- **WebSocket Communication**: Socket.IO for real-time updates
- **AI Quiz Generation**: Uses Mistral AI API for quiz content
- **Database**: MongoDB with participant tracking
- **Authentication**: JWT-based with user sessions
- **Responsive Design**: Works on desktop and mobile

The quiz room system is fully functional and ready for testing! Users can create rooms, invite friends, take AI-generated quizzes together, and compete on real-time leaderboards.
