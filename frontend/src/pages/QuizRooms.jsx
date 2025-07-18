import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../components/Store';
import Nav from '../components/Nav';
import LoginPopup from '../components/LoginPopup';

const QuizRooms = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const apiUrl = useAuthStore((state) => state.apiUrl);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  
  // Check for login on component mount
  useEffect(() => {
    if (!isLoggedIn) {
      setShowLoginPopup(true);
    } else {
      setShowLoginPopup(false);
    }
  }, [isLoggedIn]);

  const joinRoom = async (roomCode) => {
    if (!token) {
      setError('Please log in to join a room');
      return;
    }

    setJoinLoading(true);
    setError('');

    try {
      await axios.post(`${apiUrl}/quiz-room/${roomCode}/join`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      navigate(`/quiz-room/${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.response?.data?.error || 'Failed to join room');
    } finally {
      setJoinLoading(false);
    }
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      await joinRoom(joinCode.trim().toUpperCase());
      setJoinCode('');
    }
  };
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-4">          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Join a Room</h1>
            <p className="text-xl text-gray-600">Create your own quiz room or join one with a code</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-md mx-auto text-center">
              {error}
            </div>
          )}

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Create Room Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Create New Room</h3>
              <p className="text-gray-600 mb-6">Set up your own quiz room with custom questions and invite friends</p>
              <button
                onClick={() => navigate('/create-quiz-room')}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-lg"
              >
                Create Room
              </button>
            </div>
            
            {/* Join Room Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Join with Code</h3>
              <p className="text-gray-600 mb-6">Enter a room code to join an existing quiz room</p>
              
              <form onSubmit={joinByCode} className="space-y-4">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit room code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim() || joinLoading}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
                >
                  {joinLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Joining...
                    </span>
                  ) : (
                    'Join Room'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Info Section */}
          <div className="max-w-3xl mx-auto mt-16">
            <div className="bg-blue-50 rounded-xl p-8 text-center">
              <h4 className="text-xl font-semibold text-blue-800 mb-4">How it works</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-blue-700">
                <div>
                  <div className="bg-blue-200 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-blue-800">1</span>
                  </div>
                  <p className="font-medium">Create or join a room</p>
                </div>
                <div>
                  <div className="bg-blue-200 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-blue-800">2</span>
                  </div>
                  <p className="font-medium">Wait for participants</p>
                </div>
                <div>
                  <div className="bg-blue-200 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-blue-800">3</span>
                  </div>
                  <p className="font-medium">Start the quiz!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Login Popup */}
      {showLoginPopup && (
        <LoginPopup onClose={() => setShowLoginPopup(false)} />
      )}
    </>
  );
};

export default QuizRooms;
