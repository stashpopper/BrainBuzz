import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../components/Store';
import socketService from '../services/socketService';
import Nav from '../components/Nav';
import MultiplexQuiz from '../components/MultiplexQuiz';
import Leaderboard from '../components/Leaderboard';

const QuizRoom = () => {
  const { roomCode } = useParams();  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const apiUrl = useAuthStore((state) => state.apiUrl);
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);  const [quizStarted, setQuizStarted] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [userFinished, setUserFinished] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.error('QuizRoom error:', error);
      setError('Connection error occurred. Refreshing...');
      // Don't navigate away, just show error message
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);  useEffect(() => {
    // Wait for auth initialization before checking token
    if (!isInitialized) return;
    
    if (!token) {
      navigate('/login');
      return;
    }

    const initializeRoom = async () => {
      await fetchRoomData();
      setupSocketConnection();
    };

    initializeRoom();

    return () => {
      socketService.leaveRoom(roomCode, user?.id);
      socketService.removeAllListeners();
    };
  }, [roomCode, token, isInitialized]);
  const fetchRoomData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      const response = await axios.get(`${apiUrl}/quiz-room/${roomCode}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
        const roomData = response.data;
      console.log('Room data fetched:', { 
        participants: roomData.participants, 
        participantCount: roomData.participants?.length 
      });
      setRoom(roomData);
      setParticipants(roomData.participants || []);
      setLeaderboard(roomData.leaderboard || []);// Check if quiz has already started
      if (roomData.status === 'active' && roomData.quiz.isGenerated) {
        setQuizStarted(true);
        setQuizData({
          questions: roomData.quiz.questions,
          timePerQuestion: roomData.timePerQuestion
        });
        
        // Check if current user has already finished
        const currentUserParticipant = roomData.participants?.find(p => p.userId === user?.id);
        if (currentUserParticipant && currentUserParticipant.isFinished) {
          setUserFinished(true);
        }
      }
      
      // Show leaderboard if there are finished participants
      if (roomData.leaderboard && roomData.leaderboard.length > 0) {
        setShowLeaderboard(true);
        setLeaderboard(roomData.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching room data:', error);
      
      // Handle token expiration
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Session expired. Please login again.');
        // Don't redirect immediately, show error first
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(error.response?.data?.error || 'Failed to load room. Retrying...');
        // Retry after 3 seconds
        setTimeout(() => {
          fetchRoomData();
        }, 3000);
      }
    } finally {
      setLoading(false);
    }  };
  
  const setupSocketConnection = () => {
    try {
      const socket = socketService.connect(apiUrl);
      setIsConnected(true);
      
      // Join the room
      console.log('Joining room:', roomCode, 'with user:', user?.id);
      socketService.joinRoom(roomCode, user?.id);      // Listen for room events with error handling
      socketService.onRoomJoined((data) => {
        try {
          console.log('roomJoined event received:', { 
            participants: data.participants, 
            participantCount: data.participants?.length 
          });
          if (data && data.participants) {
            setParticipants(data.participants);
            
            // Check if current user has already finished
            const currentUserParticipant = data.participants?.find(p => p.userId === user?.id);
            if (currentUserParticipant && currentUserParticipant.isFinished) {
              setUserFinished(true);
            }
            
            // If quiz has already started when joining, update state
            if (data.status === 'active' && data.quiz && Array.isArray(data.quiz)) {
              setQuizStarted(true);
              setQuizData({
                questions: data.quiz, // data.quiz is the questions array from backend
                timePerQuestion: data.timePerQuestion
              });
            }
          }
        } catch (error) {
          console.error('Error handling roomJoined:', error);
        }
      });      socketService.onParticipantJoined((data) => {
        try {
          console.log('participantJoined event received:', { 
            participants: data.participants, 
            participantCount: data.participants?.length 
          });
          if (data && data.participants) {
            setParticipants(data.participants);
          }
        } catch (error) {
          console.error('Error handling participantJoined:', error);
        }
      });

      socketService.onQuizStarted((data) => {
        try {
          console.log('Quiz started event received:', data);
          if (data && data.quiz && Array.isArray(data.quiz)) {
            setIsGeneratingQuiz(false);
            setGenerationMessage('');
            setQuizStarted(true);
            // Fix the data structure for MultiplexQuiz
            const quizData = {
              questions: data.quiz, // data.quiz is the questions array from backend
              timePerQuestion: data.timePerQuestion
            };
            console.log('Setting quiz data:', quizData);
            setQuizData(quizData);
          }
        } catch (error) {
          console.error('Error handling quizStarted:', error);
        }
      });      socketService.onLeaderboardUpdate((data) => {
        try {
          console.log('Leaderboard update received:', data);
          if (data && data.leaderboard) {
            setLeaderboard(data.leaderboard);
            setShowLeaderboard(true);
            console.log('Updated leaderboard with:', data.leaderboard);
          }
        } catch (error) {
          console.error('Error handling leaderboardUpdate:', error);
        }
      });

      // Handle quiz generation progress
      socket.on('quizGenerating', (data) => {
        setIsGeneratingQuiz(true);
        setGenerationMessage(data.message || 'Generating quiz...');
      });      // Handle quiz generation errors
      socket.on('quizError', (data) => {
        setIsGeneratingQuiz(false);
        setError(data.message || 'Failed to generate quiz');
      });

      // Handle participant left
      socket.on('participantLeft', (data) => {
        try {
          if (data && data.participants) {
            setParticipants(data.participants);
          }
        } catch (error) {
          console.error('Error handling participantLeft:', error);
        }
      });

      // Handle socket disconnection
      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });      socket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected');
      });

    } catch (error) {
      console.error('Error setting up socket connection:', error);
      setError('Failed to connect to room');
    }
  };
  
  const startQuiz = async () => {
    try {
      setIsGeneratingQuiz(true);
      setGenerationMessage('Starting quiz generation...');
      
      await axios.post(`${apiUrl}/quiz-room/${roomCode}/start`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error.response?.data?.error || 'Failed to start quiz');
      setIsGeneratingQuiz(false);
      setGenerationMessage('');
    }
  };  const handleQuizComplete = async (answers) => {
    try {
      console.log('QuizRoom handling quiz complete with answers:', answers);
      console.log('Submitting to room:', roomCode);
      
      const response = await axios.post(`${apiUrl}/quiz-room/${roomCode}/submit`, 
        { answers }, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Quiz submission successful:', response.data);
      
      // Mark current user as finished
      setUserFinished(true);
      
      // Force show leaderboard and update data
      if (response.data.leaderboard) {
        setLeaderboard(response.data.leaderboard);
        setShowLeaderboard(true);
        console.log('Leaderboard data set:', response.data.leaderboard);
      }
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      console.error('Error response:', error.response?.data);
      setError('Failed to submit quiz answers: ' + (error.response?.data?.error || error.message));
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    alert('Room code copied to clipboard!');
  };  const isCreator = room && user && room.createdBy === user.id;

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 py-10 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800">Initializing...</h2>
            <p className="text-gray-600 mt-2">Please wait while we verify your session.</p>
          </div>
        </div>
      </>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 py-10 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800">Loading room...</h2>
            <p className="text-gray-600 mt-2">Please wait while we load the quiz room.</p>
            {!isConnected && (
              <p className="text-yellow-600 mt-2 text-sm">Connecting to server...</p>
            )}
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 py-10 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Connection Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button                onClick={() => {
                  setError('');
                  // Don't refetch room data if quiz is already started
                  if (!quizStarted) {
                    fetchRoomData();
                  } else {
                    // Just try to reconnect the socket
                    setupSocketConnection();
                  }
                }}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Retry Connection
              </button>
              <button 
                onClick={() => navigate('/quiz-rooms')}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Rooms
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }  // If quiz has started and user hasn't finished, show the quiz component
  if (quizStarted && !userFinished && quizData && quizData.questions && quizData.questions.length > 0) {
    console.log('Rendering MultiplexQuiz with data:', quizData);
    return (
      <MultiplexQuiz 
        quizData={quizData}
        roomCode={roomCode}
        onComplete={handleQuizComplete}
      />
    );
  }

  // If user has finished the quiz, show leaderboard
  if (userFinished && showLeaderboard) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 py-10">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-green-600 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Quiz Completed!</h2>
                <p className="text-gray-600 mb-6">
                  Great job! Check out the leaderboard below to see how you performed.
                </p>
              </div>
              
              <Leaderboard leaderboard={leaderboard} />
              
              <div className="mt-8 text-center">
                <button 
                  onClick={() => navigate('/quiz-rooms')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Back to Quiz Rooms
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-center">
              <span className="font-medium">Connection Issue:</span> Reconnecting to server...
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Room Info */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{room.roomName}</h1>
                  <p className="text-gray-600 mb-4">Created by {room.creatorName}</p>
                  
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="bg-indigo-100 px-4 py-2 rounded-lg">
                      <span className="text-indigo-800 font-bold text-lg">{roomCode}</span>
                    </div>
                    <button
                      onClick={copyRoomCode}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>

                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                    room.status === 'waiting' ? 'bg-blue-100 text-blue-800' :
                    room.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {room.status === 'waiting' ? 'Waiting to Start' :
                     room.status === 'active' ? 'Quiz in Progress' :
                     'Quiz Finished'}
                  </div>
                </div>

                {/* Quiz Settings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{room.questionCount}</div>
                    <div className="text-sm text-gray-600">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{room.timePerQuestion}s</div>
                    <div className="text-sm text-gray-600">Per Question</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{room.difficulty}</div>
                    <div className="text-sm text-gray-600">Difficulty</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{participants.length}/{room.maxParticipants}</div>
                    <div className="text-sm text-gray-600">Participants</div>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.categories.map((category, index) => (
                      <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>                {/* Quiz Generation Overlay */}
                {isGeneratingQuiz && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Generating Quiz</h4>
                    <p className="text-blue-600">{generationMessage}</p>
                    <p className="text-sm text-blue-500 mt-2">Please wait, this may take a moment...</p>
                  </div>
                )}                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  {isCreator && room.status === 'waiting' && (
                    <button
                      onClick={startQuiz}
                      disabled={participants.length === 0 || isGeneratingQuiz}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 font-medium"
                    >
                      {isGeneratingQuiz ? 'Generating Quiz...' : `Start Quiz for ${participants.length} Participant${participants.length !== 1 ? 's' : ''}`}
                    </button>
                  )}
                  
                  {!isCreator && room.status === 'waiting' && (
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">Waiting for the room creator to start the quiz...</p>
                      <p className="text-sm text-gray-500">Participants ready: {participants.length}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => navigate('/quiz-rooms')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Leave Room
                  </button>
                </div>                {isCreator && participants.length === 0 && !isGeneratingQuiz && (
                  <p className="text-center text-gray-500 mt-4 text-sm">
                    Waiting for participants to join...
                  </p>
                )}

                {!isCreator && isGeneratingQuiz && (
                  <p className="text-center text-blue-600 mt-4 text-sm font-medium">
                    🎯 Quiz is being generated by the room creator...
                  </p>
                )}
              </div>
            </div>

            {/* Participants & Leaderboard */}
            <div className="space-y-6">              {/* Participants */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Participants ({participants.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-800 font-medium">{participant.username}</span>
                        {participant.userId === user?.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">You</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {participant.isFinished ? (
                          <span className="text-green-600 text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Completed
                          </span>
                        ) : quizStarted ? (
                          <span className="text-yellow-600 text-sm font-medium flex items-center">
                            <div className="animate-pulse w-2 h-2 bg-yellow-600 rounded-full mr-2"></div>
                            Taking Quiz
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Waiting</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Show progress when quiz is active */}
                {quizStarted && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-800 font-medium">Quiz Progress:</span>
                      <span className="text-blue-600">
                        {participants.filter(p => p.isFinished).length} / {participants.length} completed
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(participants.filter(p => p.isFinished).length / participants.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>              {/* Leaderboard */}
              {showLeaderboard && leaderboard.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">🏆 Quiz Results</h3>
                    {participants.filter(p => p.isFinished).length === participants.length && participants.length > 1 && (
                      <p className="text-green-600 font-medium">🎉 Everyone has completed the quiz!</p>
                    )}
                  </div>
                  <Leaderboard leaderboard={leaderboard} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuizRoom;
