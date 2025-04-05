import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Функция для простой фильтрации потенциально опасных SQL-команд
function sanitizeInput(value) {
    const forbiddenPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    return value.replace(forbiddenPatterns, '');
}

function RegisterPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const registerAndLogin = async () => {
        try {
            const res = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: sanitizeInput(username),
                    password: sanitizeInput(password)
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // Автоматический вход
                const loginRes = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: sanitizeInput(username),
                        password: sanitizeInput(password)
                    })
                });
                const loginData = await loginRes.json();
                if (loginData.status === 'success') {
                    setUser({ id: loginData.user_id, username });
                    navigate('/chats');
                } else {
                    alert('Не удалось автоматически войти: ' + loginData.message);
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
        }
    };

    return (
        <div>
            <h2>Регистрация</h2>
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={e => setUsername(sanitizeInput(e.target.value))}
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={e => setPassword(sanitizeInput(e.target.value))}
                />
            </div>
            <button onClick={registerAndLogin}>Зарегистрироваться</button>
        </div>
    );
}

export default RegisterPage;
