import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPopup = ({ onClose }) => {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    navigate('/login');
    if (onClose) onClose();
  };
  
  const handleSignup = () => {
    navigate('/signup');
    if (onClose) onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-fade-in">
        <div className="text-center mb-6">
          <div className="ml-2 flex justify-center mb-4">
            <span className="text-4xl font-bold text-indigo-600">Brain</span>
            <span className="text-4xl font-bold text-gray-700">Buzz</span>
            <span className="ml-1 text-xs font-medium text-indigo-400 align-top">QUIZ</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Login Required</h2>
          <p className="text-gray-600 mt-2">
            You need to be logged in to create or join a quiz.
          </p>
        </div>
        
        <div className="space-y-4 mt-6">
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Log In
          </button>
          
          <button
            onClick={handleSignup}
            className="w-full px-4 py-2 text-indigo-600 font-medium border border-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Sign Up
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPopup;
