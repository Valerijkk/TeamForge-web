/* ------------------- pages/RegisterPage.jsx ------------------- */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/*
  Дополнительные проверки:
  1. SQL-инъекции
  2. HTML-теги
  3. Лимит длины
  4. Валидация логина (минимум 3 символа, максимум 20, только [a-zA-Z0-9_])
  5. Валидация пароля (не короче 6 символов, содержит буквы и цифры)
*/

function sanitizeInput(value) {
    // Убираем потенциально опасные SQL-слова
    const forbiddenSQLPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    let cleaned = value.replace(forbiddenSQLPatterns, '');
    // Удаляем HTML-теги
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    // Обрезаем до 100 символов (пример)
    cleaned = cleaned.slice(0, 100);
    return cleaned.trim();
}

function isValidUsername(username) {
    if (username.length < 3 || username.length > 20) return false;
    return /^[a-zA-Z0-9_]+$/.test(username);
}

function isValidPassword(password) {
    if (password.length < 6) return false;
    // Примерно проверяем, что есть хотя бы одна буква и цифра
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return false;
    return true;
}

function RegisterPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const registerAndLogin = async () => {
        const safeUsername = sanitizeInput(username);
        const safePassword = sanitizeInput(password);

        if (!isValidUsername(safeUsername)) {
            alert('Некорректное имя пользователя. Используйте 3–20 символов [a-zA-Z0-9_].');
            return;
        }
        if (!isValidPassword(safePassword)) {
            alert('Пароль слишком простой. Нужно минимум 6 символов, хотя бы 1 буква и 1 цифра.');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: safeUsername,
                    password: safePassword
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // Автоматический вход
                const loginRes = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: safeUsername,
                        password: safePassword
                    })
                });
                const loginData = await loginRes.json();
                if (loginData.status === 'success') {
                    setUser({ id: loginData.user_id, username: safeUsername });
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
        <div className="container">
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
