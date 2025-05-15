import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage({ setUser }) {
    // Состояния для логина и пароля
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Отправка данных для авторизации
    const login = async () => {
        // Проверка, что поля не пустые
        if (!username.trim() || !password.trim()) {
            console.error('Введите логин и пароль');
            return;
        }
        try {
            // POST-запрос на бэкенд с именем пользователя и паролем
            const res = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // Успешный вход: сохраняем пользователя и перенаправляем
                setUser({ id: data.user_id, username });
                navigate('/chats');
            } else {
                // Ошибка входа: выводим сообщение
                console.error(data.message);
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
        }
    };

    // Обработка нажатия Enter в полях ввода
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') login();
    };

    return (
        <div className="container">
            <h2>Вход</h2>

            {/* Поле ввода имени пользователя */}
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Поле ввода пароля */}
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Кнопка входа */}
            <button onClick={login}>Войти</button>

            {/* Ссылка на страницу сброса пароля */}
            <p>
                Забыли пароль? <Link to="/reset-password">Сбросить пароль</Link>
            </p>
        </div>
    );
}

export default LoginPage; // Экспорт компонента
