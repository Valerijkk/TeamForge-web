import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Повторяем ту же функцию для валидации
function sanitizeInput(value) {
    const forbiddenPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    return value.replace(forbiddenPatterns, '');
}

function LoginPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const login = async () => {
        const res = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: sanitizeInput(username),
                password: sanitizeInput(password)
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            setUser({ id: data.user_id, username });
            navigate('/chats');
        } else {
            alert(data.message);
        }
    };

    return (
        <div>
            <h2>Вход</h2>
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
            <button onClick={login}>Войти</button>
        </div>
    );
}

export default LoginPage;
