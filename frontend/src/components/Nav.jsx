import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Ava from './Ava';
import useAuthStore from '../components/Store';
import { Link } from 'react-router-dom';

function Nav() {
    const [state, setState] = useState(false);
    const navigation = [
        { title: "All Quizzes", path: "/quizlist" },
        { title: "My Quizzes", path: "/my-quizzes" },
        { title: "Quiz Rooms", path: "/quiz-rooms" },
        { title: "Document Mode", path: "/document-mode" },
    ]
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const darkMode = useAuthStore((state) => state.darkMode);
    const toggleDarkMode = useAuthStore((state) => state.toggleDarkMode);
    const navigate = useNavigate()

    function signup() {
        navigate('/signup')
    }

    return (
        <nav className="relative items-center pt-5 px-4 mx-auto max-w-screen-xl sm:px-8 md:flex md:space-x-6 dark:text-gray-200">
            <div className="flex justify-between">
                <button onClick={() => navigate('/')} className="flex items-center">
                    {/* Replace image with stylish text-based logo */}
                    <div className="flex items-center">
                        {/* Brain icon */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-8 h-8 text-indigo-600"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm.88 15.76v1.12h-1.79v-1.12c-1.1-.22-2.14-.9-2.14-1.92 0-.98.87-1.38 1.85-1.38.73 0 1.4.31 1.4 1.14 0 .67-.56.98-1.23.98h-.62v-1h.62c.45 0 .62-.19.62-.42 0-.25-.19-.41-.5-.41-.33 0-.64.16-.64.93l-.85-.07c.07-1.45.9-1.86 1.49-1.86.73 0 1.35.47 1.35 1.25 0 .63-.31 1.03-.66 1.22.42.18.74.61.74 1.16 0 .95-.67 1.31-1.64 1.41z" />
                        </svg>
                        <div className="ml-2">
                            <span className="text-2xl font-bold text-indigo-600">Brain</span>
                            <span className="text-2xl font-bold text-gray-700">Buzz</span>
                            <span className="ml-1 text-xs font-medium text-indigo-400 align-top">QUIZ</span>
                        </div>
                    </div>
                </button>
                <button className="text-gray-500 outline-none md:hidden"
                    onClick={() => setState(!state)}
                >
                    {
                        state ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )
                    }
                </button>
            </div>
            <ul className={`flex-1 justify-between mt-12 md:text-sm md:font-medium md:flex md:mt-0 ${state ? 'absolute inset-x-0 px-4 border-b bg-white dark:bg-gray-900 md:border-none md:static' : 'hidden'}`}>
                <div className="items-center space-y-5 md:flex md:space-x-6 md:space-y-0 md:ml-12">
                    {
                        navigation.map((item, idx) => (
                            <li className="text-gray-500 hover:text-indigo-600" key={idx}>
                                <button onClick={() => navigate(item.path)}>{item.title}</button>
                            </li>
                        ))
                    }
                </div>
                <li className="order-1 py-2 md:py-0">
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {darkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                </li>
                {!isLoggedIn ? <li className="order-2 py-5 md:py-0">
                    <button className="py-2 px-5 rounded-lg font-medium text-white text-center bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 duration-150 block md:py-3 md:inline"
                        onClick={signup}>
                        Register
                    </button>
                </li> : <Ava />

                }
            </ul>
        </nav>
    );

}

export default Nav;
