// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import io from 'socket.io-client';

import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage';
import ProfilePage from './pages/ProfilePage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';
import CallsPage from './pages/CallsPage';
import CalendarPage from './pages/CalendarPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import AIAssistantPage from './pages/AIAssistantPage';
import SoftwarePage from './pages/SoftwarePage';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
    const navigate = useNavigate();
    const theme = useSelector(state => state.theme);
    const dispatch = useDispatch();

    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [incomingCall, setIncomingCall] = useState(null);

    // Register for incoming calls whenever user logs in
    useEffect(() => {
        if (user) {
            socket.emit('register_user', { user_id: user.id });
            socket.on('incoming_call', data => {
                setIncomingCall(data);
            });
        }
        return () => {
            socket.off('incoming_call');
        };
    }, [user]);

    // Theme toggle
    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('appTheme', theme);
    }, [theme]);
    const toggleTheme = () => {
        dispatch({ type: 'SET_THEME', payload: theme === 'light' ? 'dark' : 'light' });
    };

    // Persist user in localStorage
    useEffect(() => {
        if (user) localStorage.setItem('user', JSON.stringify(user));
        else localStorage.removeItem('user');
    }, [user]);

    const logout = () => {
        setUser(null);
        navigate('/');
    };

    const acceptIncomingCall = () => {
        navigate('/calls');
        setIncomingCall(null);
    };

    return (
        <>
            <header>
                <div className="container nav">
                    <div
                        className="logo"
                        onClick={toggleTheme}
                        title="Нажмите, чтобы сменить тему"
                        style={{ cursor: 'pointer' }}
                    >
                        TeamForge
                    </div>
                    <nav className="menu">
                        {user ? (
                            <>
                                <Link to="/software">Программное обеспечение</Link>
                                <Link to="/knowledge">База знаний</Link>
                                <Link to="/ai-assistant">ИИ Помощник</Link>
                                <Link to="/calendar">Календарь</Link>
                                <Link to="/calls">Звонки</Link>
                                <Link to="/chats">Чаты</Link>
                                <Link to="/profile">Профиль</Link>
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

            {incomingCall && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Входящий звонок</h3>
                        <p>Пользователь ID {incomingCall.from} вас вызывает.</p>
                        <div style={{ textAlign: 'right', marginTop: '10px' }}>
                            <button onClick={acceptIncomingCall}>Принять</button>
                            <button onClick={() => setIncomingCall(null)} style={{ marginLeft: '8px' }}>
                                Отклонить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container">
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<LoginPage setUser={setUser} />} />
                    <Route path="/register" element={<RegisterPage setUser={setUser} />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/reset-password-confirm/:token" element={<ResetPasswordConfirmPage />} />
                    <Route path="/profile" element={<ProfilePage user={user} onLogout={logout} />} />
                    <Route path="/chats" element={<ChatsPage user={user} />} />
                    <Route path="/chat/:chatId" element={<ChatPage user={user} />} />
                    <Route path="/calls" element={<CallsPage user={user} />} />
                    <Route path="/calendar" element={<CalendarPage user={user} />} />
                    <Route path="/knowledge" element={<KnowledgeBasePage />} />
                    <Route path="/ai-assistant" element={<AIAssistantPage />} />
                    <Route
                        path="/software"
                        element={<SoftwarePage isAdmin={user?.username === 'admin'} />}
                    />
                </Routes>
            </div>
        </>
    );
}

export default App;
