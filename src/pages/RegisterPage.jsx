// RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const registerAndLogin = async () => {
        if (!username.trim() || !password.trim()) {
            console.error('Введите имя и пароль');
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // Автоматический вход
                const loginRes = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const loginData = await loginRes.json();
                if (loginData.status === 'success') {
                    setUser({ id: loginData.user_id, username });
                    navigate('/chats');
                } else {
                    console.error('Ошибка входа: ' + loginData.message);
                }
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') registerAndLogin();
    };

    return (
        <div className="container">
            <h2>Регистрация</h2>
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
            <button onClick={registerAndLogin}>Зарегистрироваться</button>
            <p>
                Уже зарегистрированы? <Link to="/login">Войти</Link>
            </p>
            <p>
                Забыли пароль? <Link to="/reset-password">Сбросить пароль</Link>
            </p>
        </div>
    );
}

export default RegisterPage;
