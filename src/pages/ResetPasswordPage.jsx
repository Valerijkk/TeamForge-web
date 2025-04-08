// ResetPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function ResetPasswordPage() {
    const [email, setEmail] = useState('');

    const handleResetRequest = async () => {
        if (!email.trim()) {
            console.error('Введите ваш email');
            return;
        }
        try {
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
            <button onClick={handleResetRequest}>Отправить инструкцию</button>
            <p>
                Вернуться к <Link to="/login">Входу</Link>
            </p>
        </div>
    );
}

export default ResetPasswordPage;
