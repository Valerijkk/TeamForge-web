import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Компонент страницы для запроса сброса пароля
function ResetPasswordPage() {
    // Состояние для хранения введённого email
    const [email, setEmail] = useState('');

    // Отправка запроса на сброс пароля
    const handleResetRequest = async () => {
        // Проверяем, что поле email не пустое
        if (!email.trim()) {
            console.error('Введите ваш email');
            return;
        }
        try {
            // Отправляем POST-запрос на сервер с email
            const res = await fetch('http://localhost:5000/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            // Вместо alert выводим сообщение в консоль или обновляем состояние для отображения уведомления
            console.log(data.message);
        } catch (error) {
            console.error('Ошибка при запросе сброса пароля:', error);
        }
    };

    return (
        <div className="container">
            <h2>Сброс пароля</h2>
            <div className="form-group">
                <input
                    type="email"
                    placeholder="Введите ваш email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            {/* Кнопка для отправки инструкции на указанный email */}
            <button onClick={handleResetRequest}>Отправить инструкцию</button>
            <p>
                Вернуться к <Link to="/login">Входу</Link>
            </p>
        </div>
    );
}

export default ResetPasswordPage;
