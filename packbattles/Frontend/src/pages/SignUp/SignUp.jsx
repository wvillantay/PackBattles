import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './SignUp.css';

import { API } from '../../api';

const SignUp = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [isShowPass, setIsShowPass] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !email.trim() || !password) {
            setError('All fields are required.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API}/api/auth/signup`, { name, email, password });
            login(res.data.token, res.data.user);
            navigate('/packs');
        } catch (err) {
            setError(err.response?.data?.error || 'Sign up failed. Please try again.');
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
                    <div className="col-md-6 mb-5">
                        <h1>Sign Up</h1>
                        <form onSubmit={handleSignUp}>
                            {error && (
                                <div className="alert alert-danger" role="alert" style={{ fontSize: '1.4rem' }}>
                                    {error}
                                </div>
                            )}
                            <div className="inp-wrap">
                                <input
                                    type="text"
                                    placeholder='Enter Name...'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
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
                                {loading ? 'Signing up...' : 'Sign Up'}
                            </button>
                            <p>Already have an account? <Link to="/login">Login Now</Link></p>
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

export default SignUp;
