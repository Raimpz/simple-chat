import React, { useState } from 'react';
import apiClient from '../api';
import axios from 'axios';
interface AuthPageProps {
    onLogin: (token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        try {
            if (isLogin) {
                const response = await apiClient.post('/auth/login', {
                    username: username,
                    password: password,
                });

                onLogin(response.data.token);

            } else {
                const response = await apiClient.post('/auth/register', {
                    username: username,
                    email: email,
                    password: password,
                });

                onLogin(response.data.token);
            }
        } catch (err: any) {
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data);
            } else {
                setError('An unexpected error occurred.');
            }

            console.error(err);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>{isLogin ? 'Login' : 'Register'}</h2>
                {error && <p className="error-message">{error}</p>}
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                {!isLogin && (
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                )}
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
            </form>
            <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="toggle-button">
                {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
        </div>
    );
};

export default AuthPage;