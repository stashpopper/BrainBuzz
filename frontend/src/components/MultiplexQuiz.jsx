import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from './Nav';

const MultiplexQuiz = ({ quizData, roomCode, onComplete }) => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('MultiplexQuiz received quizData:', quizData);
    if (quizData && quizData.questions) {
      console.log('Questions:', quizData.questions);
      console.log('Time per question:', quizData.timePerQuestion);
    }
  }, [quizData]);

  useEffect(() => {
    if (quizData && quizData.questions && quizData.questions.length > 0) {
      setSelectedAnswers(Array(quizData.questions.length).fill(null));
      setRemainingTime(quizData.timePerQuestion || 30); // Default 30 seconds
    }
  }, [quizData]);

  // Timer for each question
  useEffect(() => {
    if (quizData && quizData.questions && !quizFinished) {
      setRemainingTime(quizData.timePerQuestion);
      
      const timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleNextQuestion();
            return quizData.timePerQuestion;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentQuestionIndex, quizData, quizFinished]);

  const handleOptionSelect = (option) => {
    if (quizFinished) return;
    
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex] = option;
    setSelectedAnswers(updatedAnswers);
  };

  const handleNextQuestion = () => {
    if (quizFinished) return;
    
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz();
    }
  };
  const finishQuiz = () => {
    setQuizFinished(true);
    console.log('MultiplexQuiz finishing quiz with answers:', selectedAnswers);
    console.log('Quiz questions count:', quizData.questions.length);
    console.log('Answers count:', selectedAnswers.length);
    onComplete(selectedAnswers);
  };

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Loading...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </div>
      </>
    );
  }

  if (quizFinished) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl shadow-lg">
            <div className="text-green-600 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Completed!</h2>
            <p className="text-gray-600 mb-6">
              Your answers have been submitted. Check the leaderboard to see how you performed!
            </p>
            <button
              onClick={() => navigate(`/quiz-room/${roomCode}`)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
            >
              View Results
            </button>
          </div>
        </div>
      </>
    );  }

  // Add loading state if quiz data is not available
  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800">Quiz Loading...</h2>
            <p className="text-gray-600 mt-2">Please wait while the quiz loads.</p>
          </div>
        </div>
      </>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Room: {roomCode}</h1>
                <h2 className="text-lg text-gray-600">
                  Question {currentQuestionIndex + 1} of {quizData.questions.length}
                </h2>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${remainingTime <= 10 ? 'text-red-600' : 'text-indigo-600'}`}>
                  {remainingTime}s
                </div>
                <div className="text-sm text-gray-600">Time Left</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">
                {currentQuestion.question}
              </h3>

              {/* Options */}
              <div className="grid gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(option)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ${
                      selectedAnswers[currentQuestionIndex] === option
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                        : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-gray-800">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedAnswers[currentQuestionIndex] ? 'Answer selected' : 'Select an answer'}
              </div>
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
              >
                {currentQuestionIndex === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </button>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Question Progress</h4>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {quizData.questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    index === currentQuestionIndex
                      ? 'bg-indigo-600 text-white'
                      : selectedAnswers[index]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiplexQuiz;
