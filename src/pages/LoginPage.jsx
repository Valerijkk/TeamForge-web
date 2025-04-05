/* ------------------- pages/LoginPage.jsx ------------------- */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function sanitizeInput(value) {
    const forbiddenSQLPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    let cleaned = value.replace(forbiddenSQLPatterns, '');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.slice(0, 100);
    return cleaned.trim();
}

function LoginPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const login = async () => {
        const safeUsername = sanitizeInput(username);
        const safePassword = sanitizeInput(password);

        if (!safeUsername || !safePassword) {
            alert('Введите логин и пароль.');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: safeUsername,
                    password: safePassword
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setUser({ id: data.user_id, username: safeUsername });
                navigate('/chats');
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
        }
    };

    return (
        <div className="container">
            <h2>Вход</h2>
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
            </div>
            <button onClick={login}>Войти</button>
        </div>
    );
}

export default LoginPage;
