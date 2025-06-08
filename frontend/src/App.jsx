import { useEffect } from 'react';
import useAuthStore from './components/Store';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Form from './components/Form';
import Pages from './pages/Pages';
import Steps from './pages/Steps';
import QuizApp from './QuizLogic/Quiz';
import ScorePage from './QuizLogic/ScorePage';
import Quizlist from './pages/Quizlist';
import MyQuizzes from './pages/MyQuizzes';
import Logout from './components/Logout';

const App = () => {
    const initFromStorage = useAuthStore(state => state.initFromStorage);

    useEffect(() => {
        initFromStorage();
    }, [initFromStorage]);
     return (
        <Router>
            <Routes>
                <Route path="/signup" element={<Form />} />                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Pages />} />
                <Route path="/Steps" element={<Steps />} />
                <Route path="/quiz" element={<QuizApp />} />
                <Route path="/quiz/:id" element={<QuizApp />} />
                <Route path="/score" element={<ScorePage />} />
                <Route path="/quizlist" element={<Quizlist />} />
                <Route path="/my-quizzes" element={<MyQuizzes />} />
                <Route path="/Logout" element={<Logout />} />
            </Routes>
        </Router>
    );
};

export default App;
