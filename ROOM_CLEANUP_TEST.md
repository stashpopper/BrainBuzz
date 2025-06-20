# Automatic Room Cleanup Testing Guide

## Overview
This guide tests the automatic deletion of public rooms when all participants leave or disconnect from the room.

## Prerequisites
- Backend server running
- Frontend application running
- At least 2 test user accounts

## Test Scenarios

### Test 1: Manual Leave - Single User
**Objective**: Verify that a public room is deleted when the only participant manually leaves.

**Steps**:
1. User A logs in and creates a **public** quiz room
2. Verify User A is automatically added as a participant
3. User A clicks "Leave Room" or navigates away from the room
4. Check backend logs for room deletion message
5. Verify room no longer exists in the database/room list

**Expected Result**: 
- Room should be automatically deleted
- Backend should log: "Automatically deleted empty public room: [roomCode]"
- Room should not appear in quiz rooms list

### Test 2: Manual Leave - Multiple Users
**Objective**: Verify that a public room is deleted only when the last participant leaves.

**Steps**:
1. User A creates a public quiz room
2. User B joins the room
3. Verify both users are listed as participants
4. User A leaves the room
5. Verify User B is still in the room and room still exists
6. User B leaves the room
7. Check that room is now deleted

**Expected Result**:
- Room should exist after User A leaves
- Room should be deleted after User B (last participant) leaves
- Both users should see participant count updates

### Test 3: Disconnect Cleanup - Single User
**Objective**: Verify that room cleanup happens when user disconnects/closes browser.

**Steps**:
1. User A creates a public quiz room
2. User A closes the browser tab or loses connection
3. Wait a few seconds for disconnect event to process
4. Check backend logs and room existence

**Expected Result**:
- Room should be automatically deleted after disconnect
- Backend should log participant removal and room deletion

### Test 4: Private Room Protection
**Objective**: Verify that private rooms are NOT automatically deleted.

**Steps**:
1. User A creates a **private** quiz room
2. User A leaves the room or disconnects
3. Check that room still exists

**Expected Result**:
- Private room should NOT be deleted
- Room should remain in database for future access

### Test 5: Active Quiz Protection
**Objective**: Test behavior when quiz is active and participants leave.

**Steps**:
1. User A creates public room
2. User B joins room
3. User A starts the quiz
4. During quiz, User A leaves/disconnects
5. User B finishes quiz and leaves
6. Check room deletion

**Expected Result**:
- Room should be deleted when last participant leaves, regardless of quiz state

## Backend Verification Commands

### Check Room Existence (if using MongoDB)
```bash
# Connect to MongoDB and check rooms collection
mongosh
use brainbuzz
db.quizrooms.find({roomCode: "ROOM_CODE_HERE"})
```

### Monitor Backend Logs
Look for these log messages:
- `Removed participant [userId] from room [roomCode]. Remaining: [count]`
- `Automatically deleted empty public room: [roomCode]`
- `User disconnected: [socketId]`

## Frontend Verification

### Socket Events to Monitor
Open browser console and watch for:
- `participantLeft` events
- `roomDeleted` events
- Navigation to `/quiz-rooms` when room is deleted

### UI Indicators
- Participant count should update in real-time
- Users should be redirected when room is deleted
- Alert message should appear: "This room has been automatically deleted because it was empty."

## Test Data Setup

### Create Test Users
```json
User A: {
  "username": "testuser1",
  "email": "test1@example.com",
  "password": "password123"
}

User B: {
  "username": "testuser2", 
  "email": "test2@example.com",
  "password": "password123"
}
```

### Test Room Configuration
- **Public Room**: isPrivate = false
- **Private Room**: isPrivate = true
- Use simple topics like "General Knowledge" for quick quiz generation

## Troubleshooting

### Common Issues
1. **Room not deleted**: Check if room is marked as private
2. **Socket disconnect not working**: Verify userId is being tracked in socket
3. **Frontend not updating**: Check for JavaScript console errors

### Debug Steps
1. Check browser console for socket connection status
2. Monitor network tab for socket events
3. Check backend terminal for detailed logs
4. Verify participant arrays are being updated correctly

## Success Criteria
✅ Public rooms are automatically deleted when empty  
✅ Private rooms are preserved when empty  
✅ Real-time participant updates work correctly  
✅ Users are notified when rooms are deleted  
✅ No orphaned rooms remain in the database  
✅ Socket disconnect triggers cleanup properly
