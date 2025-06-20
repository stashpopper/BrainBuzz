# Participant Count Fix

## Issue
The participant count was showing 0 even when users had joined the room.

## Root Cause
**Data Format Inconsistency**: The backend was sending participant data in different formats across different events:

1. **REST API**: Missing `userId` in participants
2. **Socket `participantJoined`**: Was sending single `participant` object instead of full `participants` array
3. **Socket `roomJoined`**: Missing `userId` and `totalParticipants`

## Fix Applied

### Backend Changes (server.js)

#### 1. Fixed REST API `/quiz-room/:roomCode`
```javascript
// BEFORE
participants: room.participants.map(p => ({
  username: p.username,
  isFinished: p.isFinished,
  score: p.score
}))

// AFTER  
participants: room.participants.map(p => ({
  username: p.username,
  isFinished: p.isFinished,
  userId: p.userId,    // ✅ Added userId
  score: p.score
}))
```

#### 2. Fixed `participantJoined` Event in REST Join Endpoint
```javascript
// BEFORE
io.to(roomCode).emit('participantJoined', {
  participant: { userId: req.user.id, username: user.name },
  totalParticipants: room.participants.length
});

// AFTER
io.to(roomCode).emit('participantJoined', {
  participants: room.participants.map(p => ({ 
    username: p.username, 
    isFinished: p.isFinished,
    userId: p.userId 
  })),
  totalParticipants: room.participants.length
});
```

#### 3. Fixed Socket `roomJoined` Event
```javascript
// BEFORE
participants: room.participants.map(p => ({ 
  username: p.username, 
  isFinished: p.isFinished,
  score: p.score 
}))

// AFTER
participants: room.participants.map(p => ({ 
  username: p.username, 
  isFinished: p.isFinished,
  userId: p.userId,      // ✅ Added userId
  score: p.score 
})),
totalParticipants: room.participants.length  // ✅ Added count
```

#### 4. Fixed Socket `participantJoined` Event
```javascript
// BEFORE
socket.broadcast.to(roomCode).emit('participantJoined', {
  participants: room.participants.map(p => ({ 
    username: p.username, 
    isFinished: p.isFinished,
    score: p.score 
  }))
});

// AFTER
socket.broadcast.to(roomCode).emit('participantJoined', {
  participants: room.participants.map(p => ({ 
    username: p.username, 
    isFinished: p.isFinished,
    userId: p.userId,     // ✅ Added userId
    score: p.score 
  })),
  totalParticipants: room.participants.length  // ✅ Added count
});
```

## Expected Result

Now all participant events send consistent data:
- ✅ **Full participants array** with `userId`, `username`, `isFinished`, `score`
- ✅ **Total participants count** 
- ✅ **Real-time updates** when users join/leave
- ✅ **Proper participant tracking** in UI

## Testing Steps

1. **Create a room** - Should show creator as 1 participant
2. **Join with another user** - Should show 2 participants  
3. **Real-time updates** - Both users should see count change immediately
4. **Leave room** - Count should decrease properly

## Frontend Compatibility

The frontend `onParticipantJoined` handler expects `data.participants` array, which is now being sent correctly:

```javascript
socketService.onParticipantJoined((data) => {
  if (data && data.participants) {
    setParticipants(data.participants);  // ✅ Now receives correct data
  }
});
```
