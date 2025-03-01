import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function Chat({ user, chat, goBack }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [search, setSearch] = useState('');
    const [notification, setNotification] = useState(true);
    const [status, setStatus] = useState('');
    // Храним реакцию текущего пользователя по сообщению, например: { messageId: '👍' }
    const [userReactions, setUserReactions] = useState({});

    const fetchMessages = useCallback(() => {
        let url = `http://localhost:5000/messages/${chat.id}`;
        if (search) url += `?q=${search}`;
        fetch(url)
            .then(res => res.json())
            .then(data => setMessages(data));
    }, [chat.id, search]);

    useEffect(() => {
        socket.emit('join', { chat_id: chat.id, username: user.username });
        fetchMessages();

        const handleReceiveMessage = (data) => {
            setMessages(prev => [...prev, data]);
        };
        const handleReceiveReaction = (data) => {
            console.log('Reaction received:', data);
            // Если реакция пришла от текущего пользователя, обновляем локальное состояние
            if (data.user_id === user.id) {
                setUserReactions(prev => ({ ...prev, [data.message_id]: data.reaction }));
            }
        };
        const handleNotificationUpdated = (data) => {
            console.log('Notification settings updated:', data);
        };
        const handleStatus = (data) => {
            setStatus(data.message);
            setTimeout(() => setStatus(''), 3000);
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('receive_reaction', handleReceiveReaction);
        socket.on('notification_updated', handleNotificationUpdated);
        socket.on('status', handleStatus);

        return () => {
            socket.emit('leave', { chat_id: chat.id, username: user.username });
            socket.off('receive_message', handleReceiveMessage);
            socket.off('receive_reaction', handleReceiveReaction);
            socket.off('notification_updated', handleNotificationUpdated);
            socket.off('status', handleStatus);
        };
    }, [chat.id, user.username, fetchMessages, user.id]);

    const sendMessage = async () => {
        let media_filename = null;
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('http://localhost:5000/upload', { method: 'POST', body: formData });
            const uploadData = await res.json();
            media_filename = uploadData.filename;
        }
        socket.emit('send_message', {
            chat_id: chat.id,
            sender_id: user.id,
            content: input,
            media_filename: media_filename
        });
        setInput('');
        setFile(null);
    };

    const sendReaction = (messageId, reaction) => {
        socket.emit('send_reaction', {
            chat_id: chat.id,
            message_id: messageId,
            user_id: user.id,
            reaction: reaction
        });
        // Локально обновляем реакцию для подсветки
        setUserReactions(prev => ({ ...prev, [messageId]: reaction }));
    };

    // Функция для отображения медиафайла в зависимости от расширения
    const renderMedia = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            return <img src={`http://localhost:5000/uploads/${filename}`} alt="media" style={{ maxWidth: 200 }} />;
        }
        if (ext === 'pdf') {
            return <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">View PDF</a>;
        }
        return <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">Download file</a>;
    };

    const updateNotification = () => {
        setNotification(!notification);
        socket.emit('update_notification', {
            chat_id: chat.id,
            user_id: user.id,
            notifications_enabled: !notification
        });
    };

    return (
        <div style={{ padding: 20 }}>
            <button onClick={goBack}>← Back</button>
            <h2>{chat.name}</h2>
            <button onClick={updateNotification}>
                {notification ? 'Disable' : 'Enable'} Notifications
            </button>
            {status && <p>{status}</p>}
            <div>
                <input
                    type="text"
                    placeholder="Search messages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button onClick={fetchMessages}>Search</button>
            </div>
            <div style={{ border: '1px solid #ccc', height: 300, overflowY: 'scroll', margin: '10px 0', padding: 10 }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: 10 }}>
                        <strong>User {msg.sender_id}:</strong> {msg.content}
                        {msg.media_filename && (
                            <div>
                                {renderMedia(msg.media_filename)}
                            </div>
                        )}
                        <div>
                            <button
                                onClick={() => sendReaction(msg.id, '👍')}
                                style={userReactions[msg.id] === '👍' ? { backgroundColor: '#ddd' } : {}}
                            >
                                👍
                            </button>
                            <button
                                onClick={() => sendReaction(msg.id, '❤️')}
                                style={userReactions[msg.id] === '❤️' ? { backgroundColor: '#ddd' } : {}}
                            >
                                ❤️
                            </button>
                        </div>
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                ))}
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <input
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}

export default Chat;
