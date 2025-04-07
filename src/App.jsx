import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';
import CallsPage from './pages/CallsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import AIAssistantPage from './pages/AIAssistantPage';
import SoftwarePage from './pages/SoftwarePage';

import './App.css';

function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const navigate = useNavigate();

    useEffect(() => {
        if (user) localStorage.setItem('user', JSON.stringify(user));
        else localStorage.removeItem('user');
    }, [user]);

    const logout = () => {
        setUser(null);
        navigate('/');
    };

    // Пример проверки: считаем, что админом является пользователь с именем "admin"
    const isAdmin = user && user.username === 'admin';

    return (
        <>
            <header>
                <div className="container nav">
                    <div className="logo">TeamForge</div>
                    <nav className="menu">
                        {user ? (
                            <>
                                <Link to="/software">Программное обеспечение</Link>
                                <Link to="/knowledge">База знаний</Link>
                                <Link to="/ai-assistant">ИИ Помощник</Link>
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
            <div className="container">
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<LoginPage setUser={setUser} />} />
                    <Route path="/register" element={<RegisterPage setUser={setUser} />} />
                    <Route path="/profile" element={<ProfilePage user={user} onLogout={logout} />} />
                    <Route path="/chats" element={<ChatsPage user={user} />} />
                    <Route path="/chat/:chatId" element={<ChatPage user={user} />} />
                    <Route path="/calls" element={<CallsPage user={user} />} />
                    <Route path="/knowledge" element={<KnowledgeBasePage />} />
                    <Route path="/ai-assistant" element={<AIAssistantPage />} />
                    <Route path="/software" element={<SoftwarePage isAdmin={isAdmin} />} />
                </Routes>
            </div>
        </>
    );
}

export default App;
