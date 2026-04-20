import { useNavigate } from 'react-router-dom';
import useAuthStore from '../components/Store';
import axios from 'axios';
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

function Form() {
    const setName = useAuthStore((state) => state.setName);
    const setEmail = useAuthStore((state) => state.setEmail);
    const setPassword = useAuthStore((state) => state.setPassword);
    const setToken = useAuthStore((state) => state.setToken);
    const setUserData = useAuthStore((state) => state.setUserData);
    const name = useAuthStore((state) => state.name);
    const email = useAuthStore((state) => state.email);
    const password = useAuthStore((state) => state.password);
    const apiUrl = useAuthStore((state) => state.apiUrl);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleLoginClick = () => {
        navigate('/login');
    };
    const handlesignup = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validate inputs
        if (!name || !email || !password) {
            setError('Please fill in all fields');
            return;
        }
        
        if (name.length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }
        
        // Validate name contains only letters and optionally numbers, but not only numbers
        const nameRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;
        if (!nameRegex.test(name)) {
            setError('Name can only contain letters and numbers (must start with a letter)');
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post(`${apiUrl}/signup`, { 
                name,
                email,
                password
            });
            if (response.data.token) {
                setToken(response.data.token);
                setUserData({ name });
                navigate('/');
            }
        }
        catch (error) {
            console.error(error);
            if (error.response) {
                if (error.response.status === 400) {
                    setError(error.response.data.message || 'Signup failed. Please try again.');
                } else {
                    setError('Signup failed. Please try again.');
                }
            } else if (error.request) {
                setError('Network error. Please check your connection.');
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
        <main className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 sm:px-4">
            <div className="w-full space-y-6 text-gray-600 sm:max-w-md">                <div className="text-center">
                <div className="ml-2 flex justify-center">
                    <span className="text-4xl font-bold text-indigo-600">Brain</span>
                    <span className="text-4xl font-bold text-gray-700">Buzz</span>
                    <span className="ml-1 text-xs font-medium text-indigo-400 align-top">QUIZ</span>
                </div>
                <div className="mt-8 space-y-2">
                    <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Create an account</h3>
                    <p className="">Already have an account? <a href="javascript:void(0)" className="font-medium text-indigo-600 hover:text-indigo-500" onClick={handleLoginClick}>Log in</a></p>
                </div>
                </div>
                <div className="bg-white shadow p-4 py-6 sm:p-6 sm:rounded-lg">
                    <form
                        onSubmit={handlesignup}
                        className="space-y-5"
                    

                    >
                        <div>
                            <label className="font-medium">
                                Name
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="font-medium">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="font-medium">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                            />
                        </div>
                        <button
                            disabled={isLoading}
                            type="submit"
                            className={`w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? <LoadingSpinner size="sm" text="Creating account..." /> : 'Create account'}
                        </button>
                        
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}
                    </form>
                    
                </div>
            </div>
        </main>
        
        </>
    )
}

export default Form;
 // ✅ Export isloggedin variable
