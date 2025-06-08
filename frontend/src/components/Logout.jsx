import React from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from './Store'
const Logout = () => {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    logout();
    navigate('/login');
    return (
        <div>
            
        </div>
    )
}

export default Logout