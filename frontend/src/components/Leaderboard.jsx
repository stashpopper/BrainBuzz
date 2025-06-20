import React from 'react';

const Leaderboard = ({ leaderboard, isRealTime = true }) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTime = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🏆 Leaderboard
        </h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No completed quizzes yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🏆 Leaderboard
        </h3>
        {isRealTime && (
          <div className="flex items-center text-sm text-green-600">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Live Updates
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {leaderboard.map((participant, index) => (
          <div
            key={participant.userId}
            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
              index < 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center flex-1">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
                <span className="text-lg font-bold">
                  {getRankIcon(participant.rank)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="font-medium text-gray-800 truncate">
                    {participant.username}
                  </span>
                  {participant.rank <= 3 && (
                    <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                      Top {participant.rank}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {participant.correctAnswers}/{participant.totalQuestions} correct
                </div>
              </div>
            </div>

            <div className="text-right ml-4">
              <div className={`text-lg font-bold ${getScoreColor(participant.score)}`}>
                {participant.score}%
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(participant.timeTaken)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-6">
          <p className="text-gray-500">Waiting for participants to finish...</p>
        </div>
      )}

      {/* Stats Summary */}
      {leaderboard.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-indigo-600">
                {leaderboard.length}
              </div>
              <div className="text-xs text-gray-600">Finished</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {Math.round(leaderboard.reduce((sum, p) => sum + p.score, 0) / leaderboard.length)}%
              </div>
              <div className="text-xs text-gray-600">Avg Score</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {leaderboard[0]?.score || 0}%
              </div>
              <div className="text-xs text-gray-600">Top Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
