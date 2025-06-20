# Quiz Loading Debug Guide

## 🔍 **Debugging Steps**

### Step 1: Open Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for these debug messages when testing

### Step 2: Test Quiz Creation
1. **Create Room**: Go to Quiz Rooms → Create Room
2. **Check Console**: Should see:
   ```
   Joining room: [ROOM_CODE] with user: [USER_ID]
   ```

3. **Start Quiz**: Click "Start Quiz" button
4. **Check Console**: Should see:
   ```
   Quiz started event received: {quiz: [...], timePerQuestion: 30}
   Setting quiz data: {questions: [...], timePerQuestion: 30}
   MultiplexQuiz received quizData: {questions: [...], timePerQuestion: 30}
   ```

### Step 3: Check Backend Logs
In the backend terminal, you should see:
```
User connecting: [SOCKET_ID]
User joining room: [ROOM_CODE] userId: [USER_ID]
User [SOCKET_ID] joined room: [ROOM_CODE]
Generating quiz with AI...
AI quiz generated successfully
Emitting quizStarted to room: [ROOM_CODE]
Quiz questions count: 5
```

## 🐛 **Common Issues & Solutions**

### Issue 1: "Quiz keeps loading"
**Symptoms**: Shows loading spinner indefinitely
**Possible Causes**:
- Socket not joining room properly
- Quiz data structure incorrect
- Frontend not receiving quizStarted event

**Debug**: Check console for these messages:
- ✅ "Joining room: ..." 
- ✅ "Quiz started event received: ..."
- ✅ "MultiplexQuiz received quizData: ..."

### Issue 2: "Users disconnecting immediately"
**Symptoms**: Backend shows users connecting then disconnecting
**Possible Causes**:
- Frontend error crashing component
- Socket connection issues
- Data validation errors

**Debug**: Check browser console for errors

### Issue 3: "No quiz generation messages"
**Symptoms**: No progress messages showing
**Possible Causes**:
- Socket events not being received
- Room join failed
- Backend not emitting events

## 🧪 **Testing Checklist**

### Before Testing:
- [ ] Backend server running on port 5001
- [ ] Frontend server running on port 5173
- [ ] Logged in with valid user account
- [ ] Browser console open and visible

### During Testing:
- [ ] Create room successfully
- [ ] Join room shows participant list
- [ ] Start quiz shows generation progress
- [ ] Quiz loads with questions
- [ ] No console errors

### Expected Console Output:

#### Frontend Console:
```javascript
// Room joining
Joining room: ABC123 with user: 60f7b3b3b3b3b3b3b3b3b3b3

// Quiz starting
Quiz started event received: {
  quiz: [
    {question: "...", options: [...], correct_answer: "..."},
    // ... more questions
  ],
  timePerQuestion: 30
}

Setting quiz data: {
  questions: [...],
  timePerQuestion: 30
}

// MultiplexQuiz loading
MultiplexQuiz received quizData: {
  questions: [5 questions],
  timePerQuestion: 30
}
```

#### Backend Console:
```
User connected: abc123def456
User joining room: ABC123 userId: 60f7b3b3b3b3b3b3b3b3b3b3
User abc123def456 joined room: ABC123
Generating quiz with AI...
AI quiz generated successfully
Emitting quizStarted to room: ABC123
Quiz questions count: 5
```

## 🔧 **If Still Not Working**

1. **Check Network Tab**: See if API calls are failing
2. **Refresh Both Browsers**: Sometimes helps with socket connections
3. **Check MongoDB**: Ensure database is connected
4. **Restart Servers**: Both backend and frontend

## 💡 **Quick Fixes**

If quiz still loading:
1. Refresh the page
2. Leave and rejoin the room
3. Check if you're the room creator (only creator can start quiz)
4. Verify participants list shows your username

The debug messages will tell us exactly where the issue is occurring!
