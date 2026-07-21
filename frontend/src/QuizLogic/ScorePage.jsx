import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Nav from '../components/Nav';
import useAuthStore from '../components/Store';

const ScorePage = () => {
  const navigate = useNavigate();
  const selectedQuiz = useAuthStore((state) => state.selectedQuiz);
  const { totalQuestions: total, correctAnswers: correct, score, userAnswers } = useAuthStore((state) => state.quizResults);

  // Update quiz with last score when the score page loads
  useEffect(() => {
    if (score !== undefined && selectedQuiz?._id) {
      try {
        const quizScores = JSON.parse(localStorage.getItem('quizScores') || '{}');
        quizScores[selectedQuiz._id] = score;
        localStorage.setItem('quizScores', JSON.stringify(quizScores));
      } catch (error) {
        console.error('Error saving quiz score:', error);
      }
    }
  }, [score, selectedQuiz]);

  if (score === undefined || total === undefined || correct === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Nav />
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">No Score Available</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please take the quiz before viewing your score.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Quiz
          </button>
        </div>
      </div>
    );
  }

  // Determine grade
  let grade = '';
  if (score >= 90) grade = 'O';
  else if (score >= 80) grade = 'E';
  else if (score >= 70) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  // Filter only wrong answers
  const wrongAnswers = (userAnswers || []).filter(a => !a.isCorrect);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Score Summary */}
        <div className="p-6 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <CheckBadgeIcon className="w-6 h-6 text-indigo-600" />
            Your Quiz Score
          </h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Correct</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{correct}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{total}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Score</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{score.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Grade</p>
              <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">{grade}</p>
            </div>
          </div>
        </div>

        {/* Wrong Answers Review */}
        {wrongAnswers.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <XCircleIcon className="w-6 h-6 text-red-500" />
              Review Incorrect Answers ({wrongAnswers.length})
            </h2>

            {wrongAnswers.map((answer, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-6">
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                  Question {answer.originalIndex !== undefined ? answer.originalIndex + 1 : idx + 1}
                </p>
                <p className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  {answer.question}
                </p>

                <div className="space-y-2">
                  {/* Show all options with color coding */}
                  {(answer.options || []).map((option, optIdx) => {
                    const isCorrect = option === answer.correctAnswer;
                    const isSelected = option === answer.userAnswer;

                    let optionClass = "w-full px-4 py-3 rounded-lg border text-left text-sm ";
                    if (isCorrect) {
                      optionClass += "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300";
                    } else if (isSelected) {
                      optionClass += "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300";
                    } else {
                      optionClass += "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400";
                    }

                    return (
                      <div key={optIdx} className={optionClass}>
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {isCorrect && (
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {isSelected && !isCorrect && (
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fallback if options not stored */}
                {(!answer.options || answer.options.length === 0) && (
                  <div className="space-y-2">
                    <div className="px-4 py-3 rounded-lg border bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Your answer: {answer.userAnswer}</span>
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 rounded-lg border bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Correct answer: {answer.correctAnswer}</span>
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
            <svg className="mx-auto h-12 w-12 text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">Perfect Score!</h2>
            <p className="text-green-600 dark:text-green-300">You answered all questions correctly. Great job!</p>
          </div>
        )}

        {/* Navigation Button */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScorePage;
