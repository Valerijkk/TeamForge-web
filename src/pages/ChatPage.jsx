import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function ChatPage({ user }) {
    const { chatId } = useParams();
    const navigate = useNavigate();

    // --- Основные состояния ---
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [search, setSearch] = useState('');
    const [notification, setNotification] = useState(true);
    const [status, setStatus] = useState('');

    // Храним все реакции: { messageId: [ { user_id, reaction } ] }
    const [messageReactions, setMessageReactions] = useState({});
    // Какой ID сообщения сейчас открыт для контекстного меню
    const [menuOpenForMsgId, setMenuOpenForMsgId] = useState(null);

    // --- Модальное окно для «ответа» (Reply) ---
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [replyTargetId, setReplyTargetId] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    // --- Модальное окно для «пересылки» (Forward) ---
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [forwardMessageId, setForwardMessageId] = useState(null);
    const [availableChats, setAvailableChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState('');

    // Если пользователь не авторизован – выходим
    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Подгружаем сообщения
    const fetchMessages = useCallback(() => {
        let url = `http://localhost:5000/messages/${chatId}?user_id=${user.id}`;
        if (search) {
            url += `&q=${search}`;
        }
        fetch(url)
            .then(res => res.json())
            .then(data => setMessages(data));
    }, [chatId, search, user.id]);

    // (Опционально) Подгружаем исторические реакции, если есть эндпоинт GET /reactions/<chatId>
    const fetchReactions = useCallback(() => {
        fetch(`http://localhost:5000/reactions/${chatId}`)
            .then(res => res.json())
            .then(data => {
                setMessageReactions(data);
            })
            .catch(() => {
                // Если эндпоинта нет, игнорируем
            });
    }, [chatId]);

    // Загружаем чаты пользователя (чтобы иметь список при пересылке)
    const fetchUserChats = useCallback(() => {
        if (!user) return;
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(res => res.json())
            .then(chats => setAvailableChats(chats));
    }, [user]);

    // Подключаемся по сокету, слушаем события
    useEffect(() => {
        socket.emit('join', { chat_id: chatId, username: user?.username || '' });
        fetchMessages();
        fetchReactions();
        fetchUserChats();

        const handleReceiveMessage = (data) => {
            setMessages(prev => [...prev, data]);
        };

        const handleReceiveReaction = (data) => {
            // data = { message_id, user_id, reaction }
            const { message_id, user_id, reaction } = data;
            setMessageReactions(prev => {
                const oldReactions = prev[message_id] || [];
                const filtered = oldReactions.filter(r => r.user_id !== user_id);
                filtered.push({ user_id, reaction });
                return { ...prev, [message_id]: filtered };
            });
        };

        const handleNotificationUpdated = (data) => {
            console.log('Notification settings updated:', data);
        };

        const handleStatus = (data) => {
            setStatus(data.message);
            setTimeout(() => setStatus(''), 3000);
        };

        const handleMessageDeletedForAll = (data) => {
            setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        };

        const handleMessageDeletedForUser = (data) => {
            if (data.user_id === user.id) {
                setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
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
        };
    }, [chatId, user, fetchMessages, fetchReactions, fetchUserChats]);

    // --- Отправка нового сообщения ---
    const sendMessage = async () => {
        if (!input && !file) return;
        let media_filename = null;

        // Если выбран файл, зальём его
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
            media_filename
        });

        setInput('');
        setFile(null);
    };

    // Отправка по Enter
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    // --- Реакции ---
    const sendReaction = (messageId, reaction) => {
        socket.emit('send_reaction', {
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            reaction
        });
        // Скрыть меню после клика
        setMenuOpenForMsgId(null);
    };

    // --- Пересылка ---
    const openForwardModal = (messageId) => {
        setForwardMessageId(messageId);
        setForwardModalOpen(true);
        // Закрыть меню
        setMenuOpenForMsgId(null);
    };

    const closeForwardModal = () => {
        setForwardModalOpen(false);
        setForwardMessageId(null);
        setSelectedChatId('');
    };

    const confirmForward = async () => {
        if (!selectedChatId || !forwardMessageId) return;
        const res = await fetch('http://localhost:5000/forward_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message_id: forwardMessageId,
                to_chat_id: parseInt(selectedChatId, 10),
                user_id: user.id
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert('Сообщение переслано!');
        } else {
            alert(`Ошибка пересылки: ${data.message}`);
        }
        closeForwardModal();
    };

    // --- Ответ (Reply) ---
    const openReplyModal = (messageId) => {
        setReplyTargetId(messageId);
        setReplyContent('');
        setReplyModalOpen(true);
        // Закрыть меню
        setMenuOpenForMsgId(null);
    };

    const closeReplyModal = () => {
        setReplyModalOpen(false);
        setReplyTargetId(null);
        setReplyContent('');
    };

    const confirmReply = () => {
        if (!replyTargetId) return;
        // Отправляем сообщение с reply_to_id
        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: replyContent,
            media_filename: null,
            reply_to_id: replyTargetId
        });
        closeReplyModal();
    };

    // --- Удаление ---
    const deleteMessage = async (messageId, forAll = false) => {
        const mode = forAll ? 'everyone' : 'me';
        const url = `http://localhost:5000/messages/${messageId}?mode=${mode}&user_id=${user.id}`;
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            await fetchMessages();
        } else {
            alert(`Ошибка удаления: ${data.message}`);
        }
        setMenuOpenForMsgId(null);
    };

    // --- Контекстное меню ---
    // Останавливаем всплытие, чтобы оно не закрывалось/открывалось при клике на само сообщение
    const toggleMenuForMessage = (msgId) => {
        setMenuOpenForMsgId(prev => (prev === msgId ? null : msgId));
    };

    // --- Отображение вложенных файлов ---
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

    // --- Уведомления ---
    const updateNotification = () => {
        setNotification(!notification);
        socket.emit('update_notification', {
            chat_id: chatId,
            user_id: user.id,
            notifications_enabled: !notification
        });
    };

    // Поиск исходного сообщения для reply
    const findOriginalMessage = (reply_to_id) => {
        return messages.find(m => m.id === reply_to_id) || null;
    };

    return (
        <div>
            <button onClick={() => navigate('/chats')}>← Назад к списку чатов</button>
            <h2>TeamForge</h2>
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
                {messages.map(msg => {
                    const original = msg.reply_to_id ? findOriginalMessage(msg.reply_to_id) : null;
                    return (
                        <div
                            className="message"
                            key={msg.id}
                            // Клик по сообщению – открываем/закрываем меню
                            onClick={() => toggleMenuForMessage(msg.id)}
                            style={{ position: 'relative', cursor: 'pointer' }}
                        >
                            {/* Если сообщение переслано, на бэкенде мы можем добавить поле forwarded_from_id
                  или "forwarded_from_username" и вернуть это поле через receive_message.
                  Например: msg.forwarded_from_id != null ? ... */}
                            {msg.forwarded_from_id && (
                                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>
                                    Переслано от пользователя {msg.forwarded_from_id}
                                </div>
                            )}

                            {/* Если это «ответ», покажем небольшой блок «Ответ на ...» */}
                            {msg.reply_to_id && (
                                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>
                                    Ответ на сообщение #{msg.reply_to_id}{' '}
                                    {original && (
                                        <em>({original.content ? original.content.slice(0, 30) : '...'}...)</em>
                                    )}
                                </div>
                            )}

                            <strong>Пользователь {msg.sender_id}:</strong> {msg.content}

                            {/* Вложение */}
                            {msg.media_filename && (
                                <div>
                                    {renderMedia(msg.media_filename)}
                                </div>
                            )}

                            {/* Реакции */}
                            {messageReactions[msg.id]?.length > 0 && (
                                <div style={{ marginTop: '5px' }}>
                                    {messageReactions[msg.id].map((r, index) => (
                                        <div key={index}>
                                            Пользователь {r.user_id} поставил {r.reaction}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="small-text">
                                {new Date(msg.timestamp).toLocaleString()}
                            </div>

                            {/* Контекстное меню (останавливаем всплытие, чтобы не сработал onClick на родителе) */}
                            {menuOpenForMsgId === msg.id && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '40px',
                                        left: '10px',
                                        background: '#fff',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        padding: '10px',
                                        zIndex: 10
                                    }}
                                    onClick={(e) => e.stopPropagation()} // <-- ВАЖНО: останавливаем всплытие клика
                                >
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

            {/* Поле ввода нового сообщения */}
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

            {/* Модалка для ПЕРЕСЫЛКИ */}
            {forwardModalOpen && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h3>Переслать сообщение</h3>
                        <p>Выберите чат, куда переслать сообщение #{forwardMessageId}:</p>
                        <select
                            value={selectedChatId}
                            onChange={(e) => setSelectedChatId(e.target.value)}
                        >
                            <option value="">-- Выберите чат --</option>
                            {availableChats.map(chat => (
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

            {/* Модалка для ОТВЕТА */}
            {replyModalOpen && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
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

/* Небольшие стили для модальных окон */
const modalStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',  // Тёмная подложка
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
};

const modalContentStyle = {
    background: '#fff',
    padding: '20px',
    borderRadius: '8px',
    minWidth: '300px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
};

export default ChatPage;
