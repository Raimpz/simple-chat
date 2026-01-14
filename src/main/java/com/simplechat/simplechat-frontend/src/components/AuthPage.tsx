import React, { useState } from 'react';
import apiClient from '../api';
import axios from 'axios';

interface AuthPageProps {
    onLogin: (token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    type AuthView = 'LOGIN' | 'REGISTER' | 'VERIFY' | 'FORGOT' | 'RESET';

    const [view, setView] = useState<AuthView>('LOGIN');
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccessMsg(null);

        try {
            if (view === 'LOGIN') {
                const response = await apiClient.post('/auth/login', {
                    username,
                    password,
                });
                onLogin(response.data.token);

            } else if (view === 'REGISTER') {
                await apiClient.post('/auth/register', {
                    username,
                    email,
                    password,
                });

                setSuccessMsg('Registration successful! Please check your email for the code.');
                setView('VERIFY'); 
            } else if (view === 'FORGOT') {
                await apiClient.post('/auth/forgot-password', {
                    email
                });

                setSuccessMsg('Code sent! Check your email.');
                setView('RESET');
            
            } else if (view === 'RESET') {
                await apiClient.post('/auth/reset-password', {
                    email,
                    code,
                    newPassword: password
                });

                setSuccessMsg('Password reset! Please log in.');
                setView('LOGIN');
                setPassword('');
                setCode('');
            } else {
                await apiClient.post('/auth/verify', {
                    email,
                    code,
                });

                setSuccessMsg('Account verified! Please log in.');
                setView('LOGIN');
                setPassword(''); 
                setCode('');
            }
        } catch (err: any) {
            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data;
                setError(typeof data === 'object' && data.error ? data.error : JSON.stringify(data));
            } else {
                setError('An unexpected error occurred.');
            }
        }
    };

    const switchView = (newView: AuthView) => {
        setView(newView);
        setError(null);
        setSuccessMsg(null);
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>
                    {view === 'LOGIN' && 'Login'}
                    {view === 'REGISTER' && 'Create Account'}
                    {view === 'VERIFY' && 'Verify Account'}
                    {view === 'FORGOT' && 'Reset Password'}
                    {view === 'RESET' && 'Set New Password'}
                </h2>

                {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}
                {successMsg && <p className="success-message" style={{color: 'green'}}>{successMsg}</p>}
                {view !== 'VERIFY' && (
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                )}
                {(view === 'REGISTER' || view === 'VERIFY' || view === 'FORGOT' || view === 'RESET') && (
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                )}
                {(view === 'LOGIN' || view === 'REGISTER' || view === 'RESET') && (
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                )}
                {(view === 'VERIFY' || view === 'RESET') && (
                    <input
                        type="text"
                        placeholder="Enter 6-digit Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        maxLength={6}
                    />
                )}
                <button type="submit">
                    {view === 'LOGIN' ? 'Login' : (view === 'VERIFY' ? 'Verify Code' : 'Sign Up')}
                </button>
            </form>
            <div className="auth-links" style={{marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {view === 'LOGIN' && (
                    <>
                        <button onClick={() => switchView('REGISTER')} className="toggle-button">
                            Need an account? Register
                        </button>
                        <button onClick={() => switchView('VERIFY')} className="toggle-button">
                            Have a code? Verify Account
                        </button>
                        <button onClick={() => switchView('FORGOT')}  className="toggle-button">
                            Forgot Password?
                        </button>
                    </>
                )}

                {(view === 'VERIFY' || view === 'REGISTER') && (
                    <button onClick={() => switchView('LOGIN')} className="toggle-button">
                        Back to Login
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuthPage;