// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import io from 'socket.io-client';
import { AppBar, Toolbar, Typography, Box, Button, Container, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage';
import ProfilePage from './pages/ProfilePage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';
import CallsPage from './pages/CallsPage';
import CalendarPage from './pages/CalendarPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import AIAssistantPage from './pages/AIAssistantPage';
import SoftwarePage from './pages/SoftwarePage';

const socket = io('http://localhost:5000');

function App() {
    const navigate = useNavigate();
    const themeMode = useSelector(state => state.theme);
    const dispatch = useDispatch();

    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [incomingCall, setIncomingCall] = useState(null);

    useEffect(() => {
        if (user) {
            socket.emit('register_user', { user_id: user.id });
            socket.on('incoming_call', data => {
                setIncomingCall(data);
            });
        }
        return () => {
            socket.off('incoming_call');
        };
    }, [user]);

    useEffect(() => {
        localStorage.setItem('appTheme', themeMode);
    }, [themeMode]);

    const toggleTheme = () => {
        dispatch({ type: 'SET_THEME', payload: themeMode === 'light' ? 'dark' : 'light' });
    };

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const logout = () => {
        setUser(null);
        navigate('/');
    };

    const acceptIncomingCall = () => {
        navigate('/calls');
        setIncomingCall(null);
    };

    const muiTheme = createTheme({
        palette: { mode: themeMode },
    });

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <AppBar position="sticky" color="default" elevation={0}>
                <Toolbar>
                    <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h4" onClick={toggleTheme} sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 700, transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.1)' } }}>
                            TeamForge
                        </Typography>
                        <Box>
                            {user ? (
                                <>
                                    <Button component={RouterLink} to="/software" color="primary">Программное обеспечение</Button>
                                    <Button component={RouterLink} to="/knowledge" color="primary">База знаний</Button>
                                    <Button component={RouterLink} to="/ai-assistant" color="primary">ИИ Помощник</Button>
                                    <Button component={RouterLink} to="/calendar" color="primary">Календарь</Button>
                                    <Button component={RouterLink} to="/calls" color="primary">Звонки</Button>
                                    <Button component={RouterLink} to="/chats" color="primary">Чаты</Button>
                                    <Button component={RouterLink} to="/profile" color="primary">Профиль</Button>
                                </>
                            ) : (
                                <>
                                    <Button component={RouterLink} to="/login" color="primary">Вход</Button>
                                    <Button component={RouterLink} to="/register" color="primary">Регистрация</Button>
                                </>
                            )}
                        </Box>
                    </Container>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg">
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<LoginPage setUser={setUser} />} />
                    <Route path="/register" element={<RegisterPage setUser={setUser} />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/reset-password-confirm/:token" element={<ResetPasswordConfirmPage />} />
                    <Route path="/profile" element={<ProfilePage user={user} onLogout={logout} />} />
                    <Route path="/chats" element={<ChatsPage user={user} />} />
                    <Route path="/chat/:chatId" element={<ChatPage user={user} />} />
                    <Route path="/calls" element={<CallsPage user={user} />} />
                    <Route path="/calendar" element={<CalendarPage user={user} />} />
                    <Route path="/knowledge" element={<KnowledgeBasePage />} />
                    <Route path="/ai-assistant" element={<AIAssistantPage />} />
                    <Route path="/software" element={<SoftwarePage isAdmin={user?.username === 'admin'} />} />
                </Routes>
            </Container>

            {incomingCall && (
                <Dialog open onClose={() => setIncomingCall(null)}>
                    <DialogTitle>Входящий звонок</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Пользователь ID {incomingCall.from} вас вызывает.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={acceptIncomingCall} color="primary">Принять</Button>
                        <Button onClick={() => setIncomingCall(null)}>Отклонить</Button>
                    </DialogActions>
                </Dialog>
            )}
        </ThemeProvider>
    );
}

export default App;
