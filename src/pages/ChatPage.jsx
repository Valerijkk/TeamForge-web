// ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './ChatPage.css';

// Создаём socket (при необходимости лучше вынести в Context)
const socket = io('http://localhost:5000');

// Функция "санитайза" для ввода
function sanitizeInput(value) {
    const forbiddenSQLPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    let cleaned = value.replace(forbiddenSQLPatterns, '');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.slice(0, 500); // Чуть больше, т.к. сообщения могут быть длиннее
    return cleaned.trim();
}

function ChatPage({ user }) {
    const { chatId } = useParams();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [search, setSearch] = useState('');
    const [notification, setNotification] = useState(true);
    const [status, setStatus] = useState('');
    const [messageReactions, setMessageReactions] = useState({});
    const [menuOpenForMsgId, setMenuOpenForMsgId] = useState(null);

    // Модалки пересылки и ответа
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [replyTargetId, setReplyTargetId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [forwardMessageId, setForwardMessageId] = useState(null);
    const [availableChats, setAvailableChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState('');

    // Отслеживаем, смонтирован ли компонент
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Для отслеживания состояния уведомлений в обработчике
    const notificationRef = useRef(notification);
    useEffect(() => {
        notificationRef.current = notification;
    }, [notification]);

    // Запрос разрешения на показ нотификаций при загрузке компонента
    useEffect(() => {
        if (Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }, []);

    // Для таймаута статуса
    const timeoutRef = useRef(null);

    // Если пользователь отсутствует – перенаправляем
    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
    }, [user, navigate]);

    // Функция загрузки сообщений
    const fetchMessages = useCallback(() => {
        const safeSearch = sanitizeInput(search);
        let url = `http://localhost:5000/messages/${chatId}?user_id=${user.id}`;
        if (safeSearch) {
            url += `&q=${safeSearch}`;
        }
        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                if (mountedRef.current) {
                    setMessages(data);
                }
            })
            .catch((err) => console.error('Ошибка при загрузке сообщений:', err));
    }, [chatId, search, user.id]);

    // Функция загрузки реакций
    const fetchReactions = useCallback(() => {
        fetch(`http://localhost:5000/reactions/${chatId}`)
            .then((res) => res.json())
            .then((data) => {
                if (mountedRef.current) {
                    setMessageReactions(data);
                }
            })
            .catch(() => {
                // Если эндпоинта нет — игнорируем
            });
    }, [chatId]);

    // Функция получения списка чатов пользователя для пересылки сообщений
    const fetchUserChats = useCallback(() => {
        if (!user) return;
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then((res) => res.json())
            .then((chats) => {
                if (mountedRef.current) {
                    setAvailableChats(chats);
                }
            })
            .catch((err) => console.error('Ошибка при загрузке чатов пользователя:', err));
    }, [user]);

    // Подключение к Socket.IO и установка обработчиков событий
    useEffect(() => {
        socket.emit('join', { chat_id: chatId, username: user?.username || '' });
        fetchMessages();
        fetchReactions();
        fetchUserChats();

        const handleReceiveMessage = (data) => {
            // Заменяем текст системного сообщения
            if (data.content === 'Пользователь вошел в чат') {
                data.content = 'Пользователь не в чате';
            }
            if (mountedRef.current) {
                setMessages((prev) => [...prev, data]);
            }
            // Показываем нотификацию, если включены и сообщение от другого пользователя
            if (notificationRef.current && data.sender_id !== user.id) {
                if (Notification.permission === "granted") {
                    new Notification("Новое сообщение", {
                        body: data.content,
                        // icon: 'path_to_icon'
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification("Новое сообщение", {
                                body: data.content,
                                // icon: 'path_to_icon'
                            });
                        }
                    });
                }
            }
        };

        const handleReceiveReaction = (data) => {
            const { message_id, user_id, reaction } = data;
            if (mountedRef.current) {
                setMessageReactions((prev) => {
                    const oldReactions = prev[message_id] || [];
                    const filtered = oldReactions.filter((r) => r.user_id !== user_id);
                    filtered.push({ user_id, reaction });
                    return { ...prev, [message_id]: filtered };
                });
            }
        };

        const handleNotificationUpdated = (data) => {
            console.log('Notification settings updated:', data);
        };

        const handleStatus = (data) => {
            if (mountedRef.current) {
                setStatus(data.message);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    if (mountedRef.current) setStatus('');
                }, 3000);
            }
        };

        const handleMessageDeletedForAll = (data) => {
            if (mountedRef.current) {
                setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
            }
        };

        const handleMessageDeletedForUser = (data) => {
            if (mountedRef.current && data.user_id === user.id) {
                setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('receive_reaction', handleReceiveReaction);
        socket.on('notification_updated', handleNotificationUpdated);
        socket.on('status', handleStatus);
        socket.on('message_deleted_for_all', handleMessageDeletedForAll);
        socket.on('message_deleted_for_user', handleMessageDeletedForUser);

        return () => {
            socket.emit('leave', { chat_id: chatId, username: user?.username || '' });
            socket.off('receive_message', handleReceiveMessage);
            socket.off('receive_reaction', handleReceiveReaction);
            socket.off('notification_updated', handleNotificationUpdated);
            socket.off('status', handleStatus);
            socket.off('message_deleted_for_all', handleMessageDeletedForAll);
            socket.off('message_deleted_for_user', handleMessageDeletedForUser);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [chatId, user, fetchMessages, fetchReactions, fetchUserChats, navigate]);

    // Отправка сообщения
    const sendMessage = async () => {
        const safeInput = sanitizeInput(input);
        if (!safeInput && !file) return;

        let media_filename = null;
        if (file) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('http://localhost:5000/upload', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await res.json();
                media_filename = uploadData.filename;
            } catch (error) {
                console.error('Ошибка загрузки файла:', error);
                return;
            }
        }

        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: safeInput,
            media_filename,
        });

        setInput('');
        setFile(null);
    };

    // Отправка сообщения при нажатии Enter
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    // Отправка реакции
    const sendReaction = (messageId, reaction) => {
        socket.emit('send_reaction', {
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            reaction,
        });
        setMenuOpenForMsgId(null);
    };

    // Модальное окно пересылки
    const openForwardModal = (messageId) => {
        setForwardMessageId(messageId);
        setForwardModalOpen(true);
        setMenuOpenForMsgId(null);
    };
    const closeForwardModal = () => {
        setForwardModalOpen(false);
        setForwardMessageId(null);
        setSelectedChatId('');
    };
    const confirmForward = async () => {
        if (!selectedChatId || !forwardMessageId) return;
        try {
            const res = await fetch('http://localhost:5000/forward_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_id: forwardMessageId,
                    to_chat_id: parseInt(selectedChatId, 10),
                    user_id: user.id,
                }),
            });
            const data = await res.json();
            if (data.status !== 'success') {
                console.error(`Ошибка пересылки: ${data.message}`);
            }
        } catch (error) {
            console.error('Ошибка пересылки:', error);
        }
        closeForwardModal();
    };

    // Модальное окно ответа
    const openReplyModal = (messageId) => {
        setReplyTargetId(messageId);
        setReplyContent('');
        setReplyModalOpen(true);
        setMenuOpenForMsgId(null);
    };
    const closeReplyModal = () => {
        setReplyModalOpen(false);
        setReplyTargetId(null);
        setReplyContent('');
    };
    const confirmReply = () => {
        if (!replyTargetId) return;
        const safeContent = sanitizeInput(replyContent);
        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: safeContent,
            media_filename: null,
            reply_to_id: replyTargetId,
        });
        closeReplyModal();
    };

    // Удаление сообщения
    const deleteMessage = async (messageId, forAll = false) => {
        const mode = forAll ? 'everyone' : 'me';
        const url = `http://localhost:5000/messages/${messageId}?mode=${mode}&user_id=${user.id}`;
        try {
            const res = await fetch(url, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                await fetchMessages();
            } else {
                console.error(`Ошибка удаления: ${data.message}`);
            }
        } catch (error) {
            console.error('Ошибка удаления сообщения:', error);
        }
        setMenuOpenForMsgId(null);
    };

    // Переключение меню для сообщения
    const toggleMenuForMessage = (msgId) => {
        setMenuOpenForMsgId((prev) => (prev === msgId ? null : msgId));
    };

    // Функция для отображения медиа
    const renderMedia = (filename) => {
        if (!filename) return null;
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            return <img src={`http://localhost:5000/uploads/${filename}`} alt="media" />;
        }
        if (ext === 'pdf') {
            return (
                <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">
                    Посмотреть PDF
                </a>
            );
        }
        return (
            <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">
                Скачать файл
            </a>
        );
    };

    // Включение/отключение уведомлений
    const updateNotification = () => {
        setNotification(!notification);
        socket.emit('update_notification', {
            chat_id: chatId,
            user_id: user.id,
            notifications_enabled: !notification,
        });
    };

    // Поиск оригинального сообщения (для ответов)
    const findOriginalMessage = (reply_to_id) => {
        return messages.find((m) => m.id === reply_to_id) || null;
    };

    return (
        <div className="chat-page container">
            <div className="chat-header">
                <button className="back-button" onClick={() => navigate('/chats')}>
                    ← Назад к списку чатов
                </button>
                <h2 className="chat-title">TeamForge</h2>
                <button className="notify-toggle" onClick={updateNotification}>
                    {notification ? 'Отключить' : 'Включить'} уведомления
                </button>
                {status && <p className="status-message">{status}</p>}
            </div>

            <div className="search-bar form-group">
                <input
                    type="search"
                    placeholder="Поиск сообщений..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={fetchMessages}>Искать</button>
            </div>

            <div className="chat-container">
                {messages.map((msg) => {
                    const original = msg.reply_to_id ? findOriginalMessage(msg.reply_to_id) : null;
                    return (
                        <div className="message" key={msg.id} onClick={() => toggleMenuForMessage(msg.id)}>
                            {msg.forwarded_from_id && (
                                <div className="forwarded-label">
                                    Переслано от пользователя {msg.forwarded_from_id}
                                </div>
                            )}
                            {msg.reply_to_id && (
                                <div className="reply-label">
                                    Ответ на сообщение #{msg.reply_to_id}{' '}
                                    {original && <em>({original.content ? original.content.slice(0, 30) : '...'}...)</em>}
                                </div>
                            )}
                            <strong className="message-sender">Пользователь {msg.sender_id}:</strong>
                            <span className="message-text"> {msg.content}</span>
                            {msg.media_filename && <div className="message-media">{renderMedia(msg.media_filename)}</div>}
                            {messageReactions[msg.id]?.length > 0 && (
                                <div className="reactions-block">
                                    {messageReactions[msg.id].map((r, index) => (
                                        <div key={index} className="reaction-item">
                                            Пользователь {r.user_id} поставил {r.reaction}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="small-text message-timestamp">
                                {new Date(msg.timestamp).toLocaleString()}
                            </div>

                            {menuOpenForMsgId === msg.id && (
                                <div className="message-menu" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => sendReaction(msg.id, '👍')}>Реакция: 👍</button>
                                    <button onClick={() => sendReaction(msg.id, '❤️')}>Реакция: ❤️</button>
                                    <button onClick={() => openForwardModal(msg.id)}>Переслать</button>
                                    <button onClick={() => openReplyModal(msg.id)}>Ответить</button>
                                    <button onClick={() => deleteMessage(msg.id, false)}>Удалить у себя</button>
                                    <button onClick={() => deleteMessage(msg.id, true)}>Удалить у всех</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="chat-input form-group">
                <input
                    type="text"
                    placeholder="Введите сообщение..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <button className="send-button" onClick={sendMessage}>
                Отправить
            </button>

            {forwardModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Переслать сообщение</h3>
                        <p>Выберите чат, куда переслать сообщение #{forwardMessageId}:</p>
                        <select value={selectedChatId} onChange={(e) => setSelectedChatId(e.target.value)}>
                            <option value="">-- Выберите чат --</option>
                            {availableChats.map((chat) => (
                                <option key={chat.id} value={chat.id}>
                                    {chat.name} (ID: {chat.id})
                                </option>
                            ))}
                        </select>
                        <div style={{ marginTop: '10px', textAlign: 'right' }}>
                            <button onClick={confirmForward}>Переслать</button>
                            <button onClick={closeForwardModal} style={{ marginLeft: '10px' }}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {replyModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Ответ на сообщение #{replyTargetId}</h3>
                        <textarea
                            rows="4"
                            style={{ width: '100%' }}
                            placeholder="Введите ваш ответ..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                        />
                        <div style={{ marginTop: '10px', textAlign: 'right' }}>
                            <button onClick={confirmReply}>Отправить</button>
                            <button onClick={closeReplyModal} style={{ marginLeft: '10px' }}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatPage;
