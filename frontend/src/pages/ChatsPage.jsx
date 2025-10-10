// ChatsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, List, ListItem, ListItemText, IconButton, TextField, FormControlLabel, Checkbox, Divider, Button, Box } from '@mui/material';
import { Delete } from '@mui/icons-material';

function ChatsPage({ user }) {
    const [chats, setChats] = useState([]);
    const [allFriends, setAllFriends] = useState([]);
    const [selected, setSelected] = useState([]);
    const [chatName, setChatName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        let isMounted = true;
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(res => res.json())
            .then(data => { if (isMounted) setChats(data); })
            .catch(console.error);
        fetch(`http://localhost:5000/friends/${user.id}`)
            .then(res => res.json())
            .then(data => { if (isMounted) setAllFriends(data); })
            .catch(console.error);
        return () => { isMounted = false; };
    }, [user, navigate]);

    const toggleSelect = (u) => {
        if (selected.includes(u.id)) {
            setSelected(selected.filter(id => id !== u.id));
        } else {
            setSelected([...selected, u.id]);
        }
    };

    const createChat = async () => {
        const safeName = chatName.trim();
        if (!safeName || selected.length === 0) {
            alert('Укажите название чата и выберите участников.');
            return;
        }
        const res = await fetch('http://localhost:5000/create_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: safeName, user_ids: selected, creator_id: user.id })
        });
        const data = await res.json();
        if (data.status === 'success') {
            const newChat = { id: data.chat_id, name: safeName, is_group: true };
            setChats(prev => [...prev, newChat]);
            navigate(`/chat/${newChat.id}`);
        } else {
            alert(data.message);
        }
    };

    const openChat = (chat) => {
        navigate(`/chat/${chat.id}`);
    };

    const deleteChat = async (chat, e) => {
        e.stopPropagation();
        if (!window.confirm(`Удалить чат «${chat.name}»?`)) return;
        const res = await fetch(`http://localhost:5000/chat/${chat.id}?user_id=${user.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            setChats(prev => prev.filter(c => c.id !== chat.id));
        } else {
            alert(data.message);
        }
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>Ваши чаты</Typography>
            {chats.length === 0 ? (
                <Typography>У вас пока нет ни одного чата.</Typography>
            ) : (
                <List>
                    {chats.map(chat => (
                        <ListItem key={chat.id} button onClick={() => openChat(chat)}>
                            <ListItemText primary={chat.name} />
                            <IconButton edge="end" onClick={(e) => deleteChat(chat, e)}>
                                <Delete />
                            </IconButton>
                        </ListItem>
                    ))}
                </List>
            )}
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" gutterBottom>Создать групповой чат</Typography>
            <TextField
                fullWidth
                placeholder="Название чата"
                value={chatName}
                onChange={e => setChatName(e.target.value)}
            />
            <Typography sx={{ mt: 2 }}>Выберите участников (ваших друзей):</Typography>
            <Box>
                {allFriends.map(u => (
                    <FormControlLabel
                        key={u.id}
                        control={<Checkbox checked={selected.includes(u.id)} onChange={() => toggleSelect(u)} />}
                        label={u.username}
                    />
                ))}
            </Box>
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={createChat}>
                Создать чат
            </Button>
        </Container>
    );
}

export default ChatsPage;
