import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [isShowPass, setIsShowPass] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const hideShowPass = () => {
        setIsShowPass(!isShowPass);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8080/api/login', {
                email: email,
                password: password
            });
            console.log(response.data);
            // Handle response as needed (e.g., redirect user, show a success message)
        } catch (error) {
            console.error('Error logging in:', error);
            // Handle error (e.g., show an error message to the user)
        }
    };

    return (
        <section className='login'>
            {/* BG */}
            <div className="packs-bg ">
                <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                <img className='bg-img' src="./imgs/image 3 (3).png" alt="" />
            </div>
            {/* BG END */}
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <h1>Log In</h1>
                        <form onSubmit={handleLogin}>
                            <div className="inp-wrap">
                                <input type="email" placeholder='Enter Email...' value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="inp-wrap">
                                <input type={`${isShowPass ? "text" : "password"}`} placeholder='Enter Password...' value={password} onChange={(e) => setPassword(e.target.value)} />
                                <span className='icon' onClick={hideShowPass}>
                                    {isShowPass ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            </div>
                            <div className="text-end">
                                <Link to="#">Forgot your password?</Link>
                            </div>
                            <button type='submit' className='form-btn'>Log In</button>
                            <p>Don’t have an account? <Link to={"/signup"}>Create New</Link></p>
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
