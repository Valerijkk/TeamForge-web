// RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, TextField, Button, Box } from '@mui/material';

function RegisterPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const registerAndLogin = async () => {
        if (!username.trim() || !email.trim() || !password.trim()) {
            console.error('Введите имя, email и пароль');
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (data.status === 'success') {
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
                    console.error('Ошибка входа: ' + loginData.message);
                }
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') registerAndLogin();
    };

    return (
        <Container maxWidth="xs" sx={{ mt: 8 }}>
            <Typography variant="h4" gutterBottom>Регистрация</Typography>
            <Box component="form" sx={{ mt: 1 }}>
                <TextField
                    label="Имя пользователя"
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <TextField
                    label="Пароль"
                    type="password"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={registerAndLogin}
                >
                    Зарегистрироваться
                </Button>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Уже зарегистрированы? <a href="/login">Вход</a>
                </Typography>
            </Box>
        </Container>
    );
}

export default RegisterPage;
