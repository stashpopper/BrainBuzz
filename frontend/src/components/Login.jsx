import { useNavigate } from 'react-router-dom';
import useAuthStore from '../components/Store';
import axios from 'axios';
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

function Login () {
    const setEmail = useAuthStore((state) => state.setEmail);
    const setPassword = useAuthStore((state) => state.setPassword);
    const apiUrl = useAuthStore((state) => state.apiUrl);
    const email = useAuthStore((state) => state.email);
    const password = useAuthStore((state) => state.password);
    const setToken = useAuthStore((state) => state.setToken);
    const setUserData = useAuthStore((state) => state.setUserData);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    function handlesignupClick() {
        navigate('/signup');
    }    const handleLogin = async () => {
        setError('');
        setIsLoading(true);
        
        // Validate inputs
        if (!email || !password) {
            setError('Please enter both email and password');
            setIsLoading(false);
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }
        
        try {
            const response = await axios.post(`${apiUrl}/login`, { email, password });

            if (response.data.token) {
                setToken(response.data.token);
                setUserData({ 
                    name: response.data.name,
                    id: response.data.id,
                    email: response.data.email
                });
                navigate('/');  // Redirect after login
            }
        } catch (error) {
            console.error("Login failed", error);
            if (error.response) {
                if (error.response.status === 401) {
                    setError('Invalid email or password');
                } else if (error.response.status === 400) {
                    setError(error.response.data.message || 'Invalid credentials');
                } else {
                    setError('Login failed. Please try again.');
                }
            } else {
                setError('Network error. Please check your connection.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <main className="w-full h-screen flex flex-col items-center justify-center px-4">
            <div className="max-w-sm w-full text-gray-600 space-y-5">
                <div className="text-center pb-8">                <div className="ml-2 flex justify-center">
                    <span className="text-4xl font-bold text-indigo-600">Brain</span>
                    <span className="text-4xl font-bold text-gray-700">Buzz</span>
                    <span className="ml-1 text-xs font-medium text-indigo-400 align-top">QUIZ</span>
                </div>
                <div className="mt-8">
                    <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Log in to your account</h3>
                </div>
                </div>
                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="space-y-5"
                >
                    <div>
                        <label className="font-medium">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            placeholder='Enter your email'
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
                            placeholder='Enter your password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                        />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-x-3">
                            <input type="checkbox" id="remember-me-checkbox" className="checkbox-item peer hidden" />
                            <label
                                htmlFor="remember-me-checkbox"
                                className="relative flex w-5 h-5 bg-white peer-checked:bg-indigo-600 rounded-md border ring-offset-2 ring-indigo-600 duration-150 peer-active:ring cursor-pointer after:absolute after:inset-x-0 after:top-[3px] after:m-auto after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
                            >
                            </label>
                            <span>Remember me</span>
                        </div>
                        <a href="javascript:void(0)" className="text-center text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                    </div>
                    <button
                        disabled={isLoading}
                        className={`w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleLogin}> 
                        {isLoading ? <LoadingSpinner size="sm" text="Signing in..." /> : 'Sign in'}
                    </button>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}
                </form>
                
                <p className="text-center">Don't have an account? <a href="javascript:void(0)" className="font-medium text-indigo-600 hover:text-indigo-500" onClick={handlesignupClick}>Sign up</a></p>
            </div>
        </main>
    )
}

export default Login;
