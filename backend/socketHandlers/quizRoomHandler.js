const QuizRoom = require('../models/quizRoom');

/**
 * Initialize Socket.IO handlers for quiz rooms
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function initializeSocketHandlers(io) {

    // Helper function to remove participant from room
    const removeParticipantFromRoom = async (roomCode, userId) => {
        try {
            const room = await QuizRoom.findOne({ roomCode });

            if (!room) return;

            const initialCount = room.participants.length;
            room.participants = room.participants.filter(p => p.userId.toString() !== userId.toString());

            if (room.participants.length < initialCount) {
                await room.save();
                console.log(`Removed participant ${userId} from room ${roomCode}. Remaining: ${room.participants.length}`);

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

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join quiz room
        socket.on('joinRoom', async (data) => {
            try {
                const { roomCode, userId } = data;
                console.log('User joining room:', roomCode, 'userId:', userId);

                socket.userId = userId;
                socket.currentRoom = roomCode;

                socket.join(roomCode);
                console.log('User', socket.id, 'joined room:', roomCode);

                const room = await QuizRoom.findOne({ roomCode });
                if (room) {
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

                        socket.emit('quizStarted', {
                            quiz: room.quiz.questions,
                            timePerQuestion: room.timePerQuestion
                        });
                    } else {
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

        // Join user channel for document processing updates
        socket.on('joinUserChannel', (data) => {
            const { userId } = data;
            if (userId) {
                socket.join(`user_${userId}`);
                console.log('User', socket.id, 'joined user channel:', `user_${userId}`);
            }
        });

        // Leave room
        socket.on('leaveRoom', async (data) => {
            const { roomCode, userId } = data;
            socket.leave(roomCode);

            if (userId) {
                await removeParticipantFromRoom(roomCode, userId);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);

            if (socket.userId && socket.currentRoom) {
                await removeParticipantFromRoom(socket.currentRoom, socket.userId);
            }
        });
    });
}

module.exports = { initializeSocketHandlers };
