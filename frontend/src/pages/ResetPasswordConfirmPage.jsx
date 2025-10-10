// ResetPasswordConfirmPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Typography, TextField, Button, Box } from '@mui/material';

function ResetPasswordConfirmPage() {
    const { token } = useParams();
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
            navigate('/login');
        } catch (error) {
            console.error('Ошибка сброса пароля:', error);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ mt: 8 }}>
            <Typography variant="h4" gutterBottom>Подтверждение сброса пароля</Typography>
            <Box sx={{ mt: 2 }}>
                <TextField
                    label="Новый пароль"
                    type="password"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                    label="Подтверждение пароля"
                    type="password"
                    fullWidth
                    margin="normal"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={handlePasswordReset}
                >
                    Сбросить пароль
                </Button>
                <Typography sx={{ mt: 2 }}>
                    Вернуться к <RouterLink to="/login">входу</RouterLink>
                </Typography>
            </Box>
        </Container>
    );
}

export default ResetPasswordConfirmPage;
