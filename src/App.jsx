// App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
// Импортируем React-Redux хуки
import { useSelector, useDispatch } from 'react-redux';

// Импорт основных страниц проекта
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';
import CallsPage from './pages/CallsPage';
import CalendarPage from './pages/CalendarPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import AIAssistantPage from './pages/AIAssistantPage';
import SoftwarePage from './pages/SoftwarePage';

// Импорт страниц для сброса пароля
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage';

import './App.css';

function App() {
    const navigate = useNavigate();

    // Берём тему из Redux
    const theme = useSelector((state) => state.theme);
    // Чтобы менять тему, нужен dispatch
    const dispatch = useDispatch();

    // Локальное состояние для пользователя
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    // Когда user меняется, обновляем localStorage (чтобы не потерять user при обновлении страницы)
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    // Когда theme меняется, прописываем её в body.className и сохраняем в localStorage
    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('appTheme', theme);
    }, [theme]);

    // Функция переключения темы: отправляем экшен в Redux
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        dispatch({ type: 'SET_THEME', payload: newTheme });
    };

    // Функция выхода
    const logout = () => {
        setUser(null);
        navigate('/');
    };

    // Для примера условная проверка "админ" (можно оставить как было)
    const isAdmin = user && user.username === 'admin';

    return (
        <>
            {/* Шапка с логотипом (при клике - toggleTheme) и навигация */}
            <header>
                <div className="container nav">
                    <div
                        className="logo"
                        onClick={toggleTheme}
                        style={{ cursor: 'pointer' }}
                        title="Нажмите, чтобы сменить тему"
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

            {/* Основной контент + роутинг */}
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
                    <Route path="/software" element={<SoftwarePage isAdmin={isAdmin} />} />
                </Routes>
            </div>
        </>
    );
}

export default App;
