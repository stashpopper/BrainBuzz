import { LinkIcon } from '@heroicons/react/24/outline';
import Next from './Next';
import useAuthStore from '../components/Store'; // ✅ Import Zustand store
import { useNavigate } from 'react-router-dom';

const Review = () => {
    const { questionCount, timePerQuestion, optionsCount } = useAuthStore(); // ✅ Import state from Zustand store
    const navigate = useNavigate();
    return (
        <div className="max-w-md mx-auto px-4 space-y-8 py-12">
            
                

         {/* Review Section */}
<div className="space-y-6">
    <div className="p-6 bg-white border rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Quiz Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Questions</p>
                <p className="text-2xl font-semibold text-gray-800">{questionCount}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Options per Question</p>
                <p className="text-2xl font-semibold text-gray-800">{optionsCount}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Time per Question</p>
                <p className="text-2xl font-semibold text-gray-800">{timePerQuestion}s</p>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-xs font-medium text-indigo-600 mb-1">Total Duration</p>
                <p className="text-2xl font-semibold text-indigo-600">
                    {(questionCount * timePerQuestion / 60).toFixed(1)} mins
                </p>
            </div>
        </div>
    </div>

   
    </div>


                {/* Note about multiplayer */}
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <LinkIcon className="w-5 h-5 text-gray-600" />
                        <h3 className="text-gray-800 font-medium">Multiplayer Quiz</h3>
                    </div>
                    
                    <div className="text-gray-600 text-sm">
                        <p>Want to play with others? Use the Quiz Rooms feature!</p>
                        <div className="mt-4">
                            <button 
                                onClick={() => navigate('/quiz-rooms')} 
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                            >
                                Go to Quiz Rooms
                            </button>
                        </div>
                    </div>
                    
                    <p className="mt-3 text-xs text-gray-500">
                        Create multiplayer quiz rooms and invite friends with a room code
                    </p>
                </div>
                <Next/>
            </div>

        
    );
};

export default Review;