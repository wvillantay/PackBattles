import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from 'react-router-dom';
import axios from 'axios';
import "./SignUp.css"; // Import the CSS file for styling

const SignUp = () => {
    const [isShowPass, setIsShowPass] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const hideShowPass = () => {
        setIsShowPass(!isShowPass);
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8080/api/signup', {
                name: name,
                email: email,
                password: password
            });
            console.log(response.data);
            // Handle response as needed (e.g., redirect user, show a success message)
        } catch (error) {
            console.error('Error signing up:', error);
            // Handle error (e.g., show an error message to the user)
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
                            <div className="inp-wrap">
                                <input type="text" placeholder='Enter Name...' value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="inp-wrap">
                                <input type="email" placeholder='Enter Email...' value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="inp-wrap">
                                <input type={`${isShowPass ? "text" : "password"}`} placeholder='Enter Password...' value={password} onChange={(e) => setPassword(e.target.value)} />
                                <span className='icon' onClick={hideShowPass}>
                                    {isShowPass ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            </div>
                            <button type="submit" className='form-btn'>Sign Up</button>
                            <p>Already have an account? <Link to={"/login"}>Login Now</Link></p>
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
