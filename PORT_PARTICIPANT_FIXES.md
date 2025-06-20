# Port and Participant Count Fixes

## Issues Fixed

### 1. Port Already in Use (EADDRINUSE) 
**Problem**: Server doesn't shut down properly when nodemon restarts
**Solution**: Added graceful shutdown handlers

```javascript
// Added to server.js
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
```

### 2. Participant Count Flickering
**Problem**: Shows 1 participant briefly then reverts to 0
**Solution**: 
- Added debugging logs to track participant data flow
- Made fetchRoomData async and wait before socket connection
- Added console logs to both frontend and backend

## Quick Fix for Port Issue

Created `kill-port.bat` script:
```bash
# Run this in backend folder if port is still stuck:
./kill-port.bat
```

## Debugging Added

### Frontend Logs
- Room data fetch shows participant count
- Socket events show participant updates
- All participant-related events now logged

### Backend Logs  
- Room creation shows participants
- GET room data shows current participants
- Socket joins show participant updates

## Testing Steps

1. **Start fresh**: Run `kill-port.bat` if needed
2. **Create room**: Check console for "Room created with creator as participant"
3. **Join room**: Check console for participant updates
4. **Watch count**: Should stay consistent and not flicker

## Expected Console Output

### Backend
```
Room created with creator as participant: { roomCode: 'ABC123', participantCount: 1, participants: [...] }
GET room data: { roomCode: 'ABC123', participantCount: 1, participants: [...] }
User joining room: ABC123 userId: 123...
```

### Frontend
```
Room data fetched: { participants: [...], participantCount: 1 }
roomJoined event received: { participants: [...], participantCount: 1 }
participantJoined event received: { participants: [...], participantCount: 2 }
```

The debugging will help identify exactly where the participant count is getting reset.
