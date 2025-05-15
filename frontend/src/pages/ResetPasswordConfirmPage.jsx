import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// Компонент страницы для подтверждения сброса пароля
function ResetPasswordConfirmPage() {
    // Получаем токен из URL-параметров
    const { token } = useParams();
    // Хук для программной навигации
    const navigate = useNavigate();
    // Состояния для ввода нового пароля и его подтверждения
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    // Обработка отправки нового пароля на сервер
    const handlePasswordReset = async () => {
        // Проверяем, что оба поля заполнены
        if (!password || !passwordConfirm) {
            console.error('Введите пароль и подтверждение');
            return;
        }
        // Проверяем, что пароли совпадают
        if (password !== passwordConfirm) {
            console.error('Пароли не совпадают');
            return;
        }
        try {
            // Отправляем POST-запрос с токеном и паролями
            const res = await fetch(`http://localhost:5000/reset-password-confirm/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, password_confirm: passwordConfirm })
            });
            const data = await res.json();
            console.log(data.message);
            // После успешного сброса перенаправляем пользователя на страницу входа
            navigate('/login');
        } catch (error) {
            console.error('Ошибка сброса пароля:', error);
        }
    };

    return (
        <div className="container">
            <h2>Подтверждение сброса пароля</h2>

            {/* Поле для ввода нового пароля */}
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Новый пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            {/* Поле для подтверждения пароля */}
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Подтверждение пароля"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                />
            </div>

            {/* Кнопка отправки запроса на сброс */}
            <button onClick={handlePasswordReset}>Сбросить пароль</button>

            {/* Ссылка для возврата на страницу входа */}
            <p>
                Вернуться к <Link to="/login">Входу</Link>
            </p>
        </div>
    );
}

export default ResetPasswordConfirmPage;
