import { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage'; 
import apiClient from './api';
import { UserDto } from './types';

function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await apiClient.get<UserDto>('/users/me');
          setCurrentUser(response.data);
        } catch (error) {
          console.error("Invalid token, logging out.", error);
          handleLogout();
        } finally {
          setLoadingUser(false);
        }
      } else {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [token]);


  const handleLogin = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
  };

  if (loadingUser) {
    return <div className="App">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>SimpleChat</h1>
        {currentUser && (
          <div className="header-user-info">
            <span>Logged in as: <strong>{currentUser.username}</strong></span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        )}
      </header>
      {token && currentUser ? (
        <ChatPage token={token} currentUser={currentUser} />
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;