/* ------------------- pages/ChatPage.jsx ------------------- */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function ChatPage({ user }) {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [search, setSearch] = useState('');
    const [notification, setNotification] = useState(true);
    const [status, setStatus] = useState('');
    const [chatName, setChatName] = useState(''); // Можно хранить имя чата, если нужно

    // Реакции текущего пользователя: { messageId: '👍' }
    const [userReactions, setUserReactions] = useState({});

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
    }, [user, navigate]);

    const fetchChatName = useCallback(() => {
        // Если нужно показывать название чата вверху,
        // можно получиться из списка чатов или запросом
        // пока оставим пустым
        // setChatName('Название чата'); // Можно динамически
    }, []);

    const fetchMessages = useCallback(() => {
        let url = `http://localhost:5000/messages/${chatId}`;
        if (search) url += `?q=${search}`;
        fetch(url)
            .then(res => res.json())
            .then(data => setMessages(data));
    }, [chatId, search]);

    useEffect(() => {
        fetchChatName();
        socket.emit('join', { chat_id: chatId, username: user?.username || '' });
        fetchMessages();

        const handleReceiveMessage = (data) => {
            setMessages(prev => [...prev, data]);
        };
        const handleReceiveReaction = (data) => {
            // Если реакция пришла от текущего пользователя, обновим локально
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
            socket.emit('leave', { chat_id: chatId, username: user?.username || '' });
            socket.off('receive_message', handleReceiveMessage);
            socket.off('receive_reaction', handleReceiveReaction);
            socket.off('notification_updated', handleNotificationUpdated);
            socket.off('status', handleStatus);
        };
    }, [chatId, user, fetchChatName, fetchMessages]);

    const sendMessage = async () => {
        if (!input && !file) return; // не отправлять пустые
        let media_filename = null;
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('http://localhost:5000/upload', { method: 'POST', body: formData });
            const uploadData = await res.json();
            media_filename = uploadData.filename;
        }
        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: input,
            media_filename: media_filename
        });
        setInput('');
        setFile(null);
    };

    const handleKeyDown = (e) => {
        // Отправка по нажатию Enter
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    const sendReaction = (messageId, reaction) => {
        socket.emit('send_reaction', {
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            reaction: reaction
        });
        setUserReactions(prev => ({ ...prev, [messageId]: reaction }));
    };

    const renderMedia = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            return <img src={`http://localhost:5000/uploads/${filename}`} alt="media" />;
        }
        if (ext === 'pdf') {
            return <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">Посмотреть PDF</a>;
        }
        return <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">Скачать файл</a>;
    };

    const updateNotification = () => {
        setNotification(!notification);
        socket.emit('update_notification', {
            chat_id: chatId,
            user_id: user.id,
            notifications_enabled: !notification
        });
    };

    return (
        <div>
            <button onClick={() => navigate('/chats')}>← Назад к списку чатов</button>
            <h2>{chatName || 'TeamForge'}</h2>
            <button onClick={updateNotification}>
                {notification ? 'Отключить' : 'Включить'} уведомления
            </button>
            {status && <p className="status-message">{status}</p>}

            <div>
                <input
                    type="search"
                    placeholder="Поиск сообщений..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button onClick={fetchMessages}>Искать</button>
            </div>

            <div className="chat-container">
                {messages.map((msg) => (
                    <div className="message" key={msg.id}>
                        <strong>Пользователь {msg.sender_id}:</strong> {msg.content}
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
                        <div className="small-text">{new Date(msg.timestamp).toLocaleString()}</div>
                    </div>
                ))}
            </div>

            <div>
                <input
                    type="text"
                    placeholder="Введите сообщение..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <input
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                />
                <button onClick={sendMessage}>Отправить</button>
            </div>
        </div>
    );
}

export default ChatPage;
