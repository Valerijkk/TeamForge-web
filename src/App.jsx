/* App.jsx */
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';

import './App.css';

function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const logout = () => {
        setUser(null);
        navigate('/'); // После логаута на главную
    };

    return (
        <>
            <header>
                <div className="container nav">
                    <div className="logo">TeamForge</div>
                    <nav className="menu">
                        {user ? (
                            <>
                                <Link to="/profile">Профиль</Link>
                                <Link to="/chats">Чаты</Link>
                                {/* Кнопку "Выйти" убрали из шапки, она только в Профиле */}
                            </>
                        ) : (
                            <>
                                <Link to="/login">Вход</Link>
                                <Link to="/register">Регистрация</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <div className="container">
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<LoginPage setUser={setUser} />} />
                    <Route path="/register" element={<RegisterPage setUser={setUser} />} />
                    <Route path="/profile" element={<ProfilePage user={user} onLogout={logout} />} />
                    <Route path="/chats" element={<ChatsPage user={user} />} />
                    <Route path="/chat/:chatId" element={<ChatPage user={user} />} />
                </Routes>
            </div>
        </>
    );
}

export default App;
