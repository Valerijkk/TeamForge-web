// ProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Typography, Card, CardContent, List, ListItem, ListItemText, TextField, Button, Grid, Divider, Box
} from '@mui/material';

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function ProfilePage({ user, onLogout }) {
    const navigate = useNavigate();

    const [chatsCount, setChatsCount] = useState(0);
    const [messagesCount, setMessagesCount] = useState(0);
    const [docs, setDocs] = useState([]);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [callHistory, setCallHistory] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadProfileData = useCallback(() => {
        setError('');
        return fetch(`${BASE_URL}/profile_data/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (!mountedRef.current) return;
                setChatsCount(data?.chats_count || 0);
                setMessagesCount(data?.messages_count || 0);
                setDocs(Array.isArray(data?.docs) ? data.docs : []);
            })
            .catch(() => {
                if (!mountedRef.current) return;
                setError("Не удалось загрузить профиль.");
            });
    }, [user?.id]);

    const loadFriends = useCallback(() => {
        return fetch(`${BASE_URL}/friends/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (!mountedRef.current) return;
                setFriends(Array.isArray(data) ? data : []);
            })
            .catch(console.error);
    }, [user?.id]);

    const loadFriendRequests = useCallback(() => {
        return fetch(`${BASE_URL}/friend_requests/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (!mountedRef.current) return;
                setFriendRequests(Array.isArray(data) ? data : []);
            })
            .catch(console.error);
    }, [user?.id]);

    const loadCallHistory = useCallback(() => {
        return fetch(`${BASE_URL}/call_history/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (!mountedRef.current) return;
                setCallHistory(Array.isArray(data) ? data : []);
            })
            .catch(console.error);
    }, [user?.id]);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        setLoading(true);
        Promise.all([loadProfileData(), loadFriends(), loadFriendRequests(), loadCallHistory()])
            .catch(() => {})
            .finally(() => mountedRef.current && setLoading(false));
    }, [user, loadProfileData, loadFriends, loadFriendRequests, loadCallHistory, navigate]);

    const handleSearch = (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.trim()) {
            fetch(`${BASE_URL}/search_users?query=${encodeURIComponent(q)}`)
                .then(res => res.json())
                .then(data => {
                    if (!mountedRef.current) return;
                    setSearchResults(Array.isArray(data) ? data : []);
                })
                .catch(console.error);
        } else {
            setSearchResults([]);
        }
    };

    const sendFriendRequest = (friendId) => {
        fetch(`${BASE_URL}/send_friend_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, friend_id: friendId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Запрос отправлен');
                } else {
                    alert(data.message);
                }
            })
            .catch(console.error);
    };

    const respondFriendRequest = (friendId, accept) => {
        fetch(`${BASE_URL}/respond_friend_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, friend_id: friendId, accept })
        })
            .then(res => res.json())
            .then(() => {
                if (mountedRef.current) {
                    loadFriends();
                    loadFriendRequests();
                }
            })
            .catch(console.error);
    };

    if (!user) return null;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>Профиль</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Чаты</Typography>
                            <Typography variant="h4">{chatsCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Сообщения</Typography>
                            <Typography variant="h4">{messagesCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
                <Typography variant="h5">Документы</Typography>
                {docs.length === 0 ? (
                    <Typography>Нет документов</Typography>
                ) : (
                    <List>
                        {docs.map(doc => (
                            <ListItem key={doc.id}>
                                <ListItemText
                                    primary={doc.title}
                                    secondary={<a href={doc.url} target="_blank" rel="noreferrer">Скачать</a>}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
                <Typography variant="h5">Друзья</Typography>
                <List>
                    {friends.map(fr => (
                        <ListItem key={fr.id}>
                            <ListItemText primary={fr.username} />
                        </ListItem>
                    ))}
                </List>
                <Typography variant="h6">Запросы в друзья</Typography>
                <List>
                    {friendRequests.map(req => (
                        <ListItem key={req.id}>
                            <ListItemText primary={req.username} />
                            <Button onClick={() => respondFriendRequest(req.id, true)} color="primary">Принять</Button>
                            <Button onClick={() => respondFriendRequest(req.id, false)} color="secondary">Отклонить</Button>
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Box sx={{ mt: 3 }}>
                <Typography variant="h5">Поиск друзей</Typography>
                <TextField
                    fullWidth
                    placeholder="Поиск друзей..."
                    value={searchQuery}
                    onChange={handleSearch}
                />
                <List>
                    {searchResults.map(u => (
                        <ListItem key={u.id}>
                            <ListItemText primary={u.username} />
                            <Button onClick={() => sendFriendRequest(u.id)} variant="outlined">Добавить</Button>
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
                <Typography variant="h5">История звонков</Typography>
                {callHistory.length === 0 ? (
                    <Typography>Нет истории звонков</Typography>
                ) : (
                    <List>
                        {callHistory.map(call => (
                            <ListItem key={call.id}>
                                <ListItemText
                                    primary={`Звонок ${call.call_type} (${call.participants})`}
                                    secondary={`${call.start_time} - ${call.end_time}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            <Button variant="contained" color="secondary" sx={{ mt: 4 }} onClick={onLogout}>
                Выйти
            </Button>
        </Container>
    );
}

export default ProfilePage;
