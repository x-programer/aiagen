import React, { useEffect, useState, useContext } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate } from 'react-router-dom';

function UserAuth({ children }) {
    const [loading, setLoading] = useState(true); // Initialize loading as true
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user'); // Retrieve user data from localStorage
    const { user, setUser } = useContext(UserContext); // Add setUser from context
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            // If no token, redirect to login
            navigate('/login');
            setLoading(false);
            return;
        }

        // If user data exists in localStorage, parse it and update the context
        if (userData) {
            setUser(JSON.parse(userData)); // Parse the stored user data
        }

        setLoading(false); // Stop loading
    }, [token, userData, navigate, setUser]);

    if (loading) {
        return <div>Loading...</div>; // Show loading state
    }

    return children; // Render the protected component
}

export default UserAuth;