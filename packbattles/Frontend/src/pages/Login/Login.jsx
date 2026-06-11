import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

import { API } from '../../api';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [isShowPass, setIsShowPass] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password) {
            setError('Email and password are required.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API}/api/auth/login`, { email, password });
            login(res.data.token, res.data.user);
            navigate('/packs');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className='login'>
            <div className="packs-bg">
                <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                <img className='bg-img' src="./imgs/image 3 (3).png" alt="" />
            </div>
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <h1>Log In</h1>
                        <form onSubmit={handleLogin}>
                            {error && (
                                <div className="alert alert-danger" role="alert" style={{ fontSize: '1.4rem' }}>
                                    {error}
                                </div>
                            )}
                            <div className="inp-wrap">
                                <input
                                    type="email"
                                    placeholder='Enter Email...'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="inp-wrap">
                                <input
                                    type={isShowPass ? 'text' : 'password'}
                                    placeholder='Enter Password...'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <span className='icon' onClick={() => setIsShowPass(!isShowPass)}>
                                    {isShowPass ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            </div>
                            <button type="submit" className='form-btn' disabled={loading}>
                                {loading ? 'Logging in...' : 'Log In'}
                            </button>
                            <p>Don't have an account? <Link to="/signup">Create New</Link></p>
                        </form>
                    </div>
                    <div className="col-md-6">
                        <div className="login-img">
                            <img src="./imgs/Group 40099.png" width="100%" alt="" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Login;
