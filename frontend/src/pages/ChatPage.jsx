// ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Container, Typography, Paper, List, Box, TextField, IconButton } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const socket = io(BASE_URL, { transports: ["websocket"], withCredentials: true });

function ChatPage({ user }) {
    const { chatId } = useParams();
    const navigate = useNavigate();

    const [chatName, setChatName] = useState('...');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        setLoading(true);
        fetch(`${BASE_URL}/chat/${chatId}`)
            .then(res => res.json())
            .then(data => {
                setChatName(data.name);
                setMessages(data.messages);
            })
            .catch(err => setLoadError('Не удалось загрузить чат.'))
            .finally(() => setLoading(false));
    }, [chatId, user, navigate]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const res = await fetch(`${BASE_URL}/chat/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, content: input })
        });
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setInput('');
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>{chatName}</Typography>
            <Paper sx={{ height: 400, overflowY: 'auto', p: 2, mb: 2 }}>
                {loading && <Typography>Загрузка...</Typography>}
                {loadError && <Typography color="error">{loadError}</Typography>}
                {!loading && !loadError && (
                    <List>
                        {messages.map(msg => (
                            <Box key={msg.id} sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">{msg.sender}</Typography>
                                <Typography>{msg.text}</Typography>
                            </Box>
                        ))}
                    </List>
                )}
            </Paper>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                    fullWidth
                    placeholder="Введите сообщение..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <IconButton color="primary" onClick={sendMessage}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Container>
    );
}

export default ChatPage;
