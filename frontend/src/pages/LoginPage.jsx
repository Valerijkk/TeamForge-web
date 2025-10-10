// LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Typography, TextField, Button, Box } from '@mui/material';

function LoginPage({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const login = async () => {
        if (!username.trim() || !password.trim()) {
            console.error('Введите логин и пароль');
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setUser({ id: data.user_id, username });
                navigate('/chats');
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') login();
    };

    return (
        <Container maxWidth="xs" sx={{ mt: 8 }}>
            <Typography variant="h4" gutterBottom>Вход</Typography>
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
                    onClick={login}
                >
                    Войти
                </Button>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Забыли пароль? <RouterLink to="/reset-password">Сбросить пароль</RouterLink>
                </Typography>
            </Box>
        </Container>
    );
}

export default LoginPage;
