// filepath: /e:/NODEJS/AI_AGENT/frontend/src/screens/Register.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { UserContext } from '../context/user.context';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { setUser } = useContext(UserContext);

    const handleRegister = (e) => {
        e.preventDefault();
        // register logic here
        console.log('Email:', email, 'Password:', password);

        axios.post('/users/register', { email, password })
            .then(res => {
                localStorage.setItem('token', res.data.token);
                setUser(res.data.user);
                navigate('/');
            }).catch(err => {
                console.log(err.response.data);
            })

    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Register</h2>
                <form onSubmit={handleRegister}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
                    >
                        Register
                    </button>
                </form>
                {/* <p className="mt-4 text-sm">
                    Don't have an account? <Link to="/login" className="text-blue-500 hover:underline">Login</Link>
                </p> */}
            </div>
        </div>
    );
};

export default Register;