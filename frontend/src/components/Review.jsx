import { useState } from 'react';
import { ClipboardDocumentIcon, LinkIcon } from '@heroicons/react/24/outline';
import Next from './Next';
import useAuthStore from '../components/Store'; // ✅ Import Zustand store

const Review = () => {
    const { optionsCount, setOptionsCount, questionCount, setQuestionCount, timePerQuestion, setTimePerQuestion, inviteLink, setInviteLink } = useAuthStore(); // ✅ Import state and setters from Zustand store
    
    const [copied, setCopied] = useState(false);

    const optionButtons = [
        { value: 2, label: "2 Options" },
        { value: 3, label: "3 Options" },
        { value: 4, label: "4 Options" },
    ];

    

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const invitecode = async () => {
        try {
            const response = await fetch('https://brain-buzz-nu.vercel.app/invitecode'); // ✅ Use the correct URL
            const data = await response.json();
            setInviteLink(data.inviteCode);
        } catch (error) {
            console.error('Error fetching invite code:', error);
        }


    }
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


                {/* Invite Section */}
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <LinkIcon className="w-5 h-5 text-gray-600" />
                        <h3 className="text-gray-800 font-medium">Share Quiz</h3>
                    </div>
                    
                    {inviteLink ? 
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inviteLink} // ✅ Display inviteLink value in the input field
                                readOnly
                                className="w-full px-3 py-2 border rounded-lg text-sm text-gray-600 truncate"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo700 transition-colors text-sm flex items-center gap-2"
                            >
                                <ClipboardDocumentIcon className="w-4 h-4" />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    : (
                        <button

                            onClick={invitecode}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                            Generate Invite Code
                        </button>
                    )}
                    
                    <p className="mt-3 text-xs text-gray-500">
                        Share this code with participants to allow them to take the quiz
                    </p>
                </div>
                <Next/>
            </div>

        
    );
};

export default Review;