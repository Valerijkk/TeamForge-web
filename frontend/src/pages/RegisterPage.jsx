import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Страница регистрации нового пользователя
function RegisterPage({ setUser }) {
    // Локальные состояния для полей формы
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Функция регистрации и автоматического входа
    const registerAndLogin = async () => {
        // Проверяем заполненность всех полей
        if (!username.trim() || !email.trim() || !password.trim()) {
            console.error('Введите имя, email и пароль');
            return;
        }
        try {
            // Отправляем запрос на регистрацию
            const res = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // При успешной регистрации сразу выполняем вход
                const loginRes = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const loginData = await loginRes.json();
                if (loginData.status === 'success') {
                    // Сохраняем данные пользователя и переходим в чат
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

    // Обработка нажатия Enter в полях формы
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') registerAndLogin();
    };

    return (
        <div className="container">
            <h2>Регистрация</h2>

            {/* Поле для имени пользователя */}
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Поле для email */}
            <div className="form-group">
                <input
                    type="email"
                    placeholder="Ваша почта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Поле для пароля */}
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Кнопка регистрации */}
            <button onClick={registerAndLogin}>Зарегистрироваться</button>

            {/* Ссылки для навигации */}
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
