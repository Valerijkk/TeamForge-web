// ResetPasswordConfirmPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function ResetPasswordConfirmPage() {
    const { token } = useParams(); // Токен из URL
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const handlePasswordReset = async () => {
        if (!password || !passwordConfirm) {
            console.error('Введите пароль и подтверждение');
            return;
        }
        if (password !== passwordConfirm) {
            console.error('Пароли не совпадают');
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/reset-password-confirm/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, password_confirm: passwordConfirm })
            });
            const data = await res.json();
            console.log(data.message);
            // После успешного сброса пароля перенаправляем пользователя, например, на страницу входа
            navigate('/login');
        } catch (error) {
            console.error('Ошибка сброса пароля:', error);
        }
    };

    return (
        <div className="container">
            <h2>Подтверждение сброса пароля</h2>
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Новый пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    placeholder="Подтверждение пароля"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                />
            </div>
            <button onClick={handlePasswordReset}>Сбросить пароль</button>
            <p>
                Вернуться к <Link to="/login">Входу</Link>
            </p>
        </div>
    );
}

export default ResetPasswordConfirmPage;
