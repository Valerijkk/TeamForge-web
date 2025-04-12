import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

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
    // Получаем пользователя из localStorage, если ранее был залогинен
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const navigate = useNavigate();

    // Состояние темы
    const [theme, setTheme] = useState('light');

    // Функция для переключения темы при клике на логотип
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    // При изменении пользователя или темы обновляем localStorage и класс body
    useEffect(() => {
        if (user) localStorage.setItem('user', JSON.stringify(user));
        else localStorage.removeItem('user');
        document.body.className = theme;
    }, [user, theme]);

    // Функция выхода: сброс пользователя и переход на главную страницу
    const logout = () => {
        setUser(null);
        navigate('/');
    };

    // Пример проверки: считаем, что админом является пользователь с именем "admin"
    const isAdmin = user && user.username === 'admin';

    return (
        <>
            {/* Шапка с логотипом (кликабелен для смены темы) и навигационным меню */}
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

            {/* Основной контент с маршрутизацией */}
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

                    {/* ВОТ ЗДЕСЬ ГЛАВНОЕ ИЗМЕНЕНИЕ: */}
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
