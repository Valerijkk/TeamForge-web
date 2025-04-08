// LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const login = async () => {
        if (!username.trim() || !password.trim()) {
            // Можно использовать красивое уведомление вместо alert, например, toast
            console.error('Введите логин и пароль');
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setUser({ id: data.user_id, username });
                navigate('/chats');
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') login();
    };

    return (
        <div className="container">
            <h2>Вход</h2>
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <button onClick={login}>Войти</button>
            {/* Кнопка для перехода на страницу сброса пароля */}
            <p>
                Забыли пароль? <Link to="/reset-password">Сбросить пароль</Link>
            </p>
        </div>
    );
}

export default LoginPage;
