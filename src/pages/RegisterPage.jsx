/* ------------------- pages/RegisterPage.jsx ------------------- */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RegisterPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const registerAndLogin = async () => {
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
            <button onClick={registerAndLogin}>Зарегистрироваться</button>
        </div>
    );
}

export default RegisterPage;
