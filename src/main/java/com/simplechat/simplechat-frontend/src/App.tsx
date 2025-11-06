import { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';

function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>SimpleChat</h1>
        {token && <button onClick={handleLogout} className="logout-button">Logout</button>}
      </header>

      {token ? (
        <div>
          <ChatPage token={token} />
        </div>
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;