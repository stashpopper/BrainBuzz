import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }
  connect(apiUrl) {
    if (!this.socket) {
      this.socket = io(apiUrl, {
        transports: ['websocket', 'polling'],
        cors: {
          origin: true,
          credentials: true
        },
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.isConnected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.isConnected = false;
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.isConnected = false;
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinRoom(roomCode, userId) {
    if (this.socket) {
      this.socket.emit('joinRoom', { roomCode, userId });
    }
  }
  leaveRoom(roomCode, userId) {
    if (this.socket) {
      this.socket.emit('leaveRoom', { roomCode, userId });
    }
  }
  onRoomJoined(callback) {
    if (this.socket) {
      this.socket.on('roomJoined', (data) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in roomJoined callback:', error);
        }
      });
    }
  }

  onParticipantJoined(callback) {
    if (this.socket) {
      this.socket.on('participantJoined', (data) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in participantJoined callback:', error);
        }
      });
    }
  }

  onQuizStarted(callback) {
    if (this.socket) {
      this.socket.on('quizStarted', (data) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in quizStarted callback:', error);
        }
      });
    }
  }

  onLeaderboardUpdate(callback) {
    if (this.socket) {
      this.socket.on('leaderboardUpdate', (data) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in leaderboardUpdate callback:', error);
        }
      });
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();
