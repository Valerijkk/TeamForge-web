import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// Подключение к вашему бэкенду
const socket = io('http://localhost:5000');

function ChatPage({ user }) {
    const { chatId } = useParams();
    const navigate = useNavigate();

    // Список сообщений
    const [messages, setMessages] = useState([]);
    // Состояние для ввода текста
    const [input, setInput] = useState('');
    // Состояние для выбранного файла
    const [file, setFile] = useState(null);
    // Поисковая строка
    const [search, setSearch] = useState('');
    // Включённые ли уведомления
    const [notification, setNotification] = useState(true);
    // Какой-то текст статуса (например «Пользователь вошёл в чат»)
    const [status, setStatus] = useState('');

    // Все реакции (для каждого сообщения храним массив объектов { user_id, reaction })
    // Пример: { 10: [ { user_id: 2, reaction: '👍' }, { user_id: 3, reaction: '❤️' } ] }
    const [messageReactions, setMessageReactions] = useState({});

    // При клике на сообщение показываем меню (реакции, переслать, удалить и т.д.)
    const [menuOpenForMsgId, setMenuOpenForMsgId] = useState(null);

    // Если пользователь не залогинен, уходим на главную
    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Функция подгрузки сообщений (учитываем user_id, чтобы бэкенд знал, какие сообщения скрывать, если удалено "для себя")
    const fetchMessages = useCallback(() => {
        // Обратите внимание: чтобы бэкенд знал user_id, нужно передать его в query-параметре
        let url = `http://localhost:5000/messages/${chatId}?user_id=${user.id}`;
        if (search) {
            url += `&q=${search}`;
        }
        fetch(url)
            .then(res => res.json())
            .then(data => setMessages(data));
    }, [chatId, search, user.id]);

    // Функция подгрузки исторических реакций, если есть эндпоинт `GET /reactions/<chat_id>`
    const fetchReactions = useCallback(() => {
        // Если у вас нет отдельного эндпоинта, удалите эту функцию
        fetch(`http://localhost:5000/reactions/${chatId}`)
            .then(res => res.json())
            .then(data => {
                // Ожидаем, что data это объект { [msgId]: [ {user_id, reaction}, ... ] }
                setMessageReactions(data);
            })
            .catch(() => {
                // Если у вас нет такого эндпоинта, можно просто ничего не делать
            });
    }, [chatId]);

    // Подключаемся к чату через socket.io
    useEffect(() => {
        // 1) Входим в комнату чата
        socket.emit('join', { chat_id: chatId, username: user?.username || '' });
        // 2) Грузим сообщения
        fetchMessages();
        // 3) Грузим исторические реакции (при желании)
        fetchReactions();

        // Обработчик прихода нового сообщения
        const handleReceiveMessage = (data) => {
            setMessages(prev => [...prev, data]);
        };

        // Обработчик прихода реакции
        const handleReceiveReaction = (data) => {
            // data = { message_id, user_id, reaction }
            const { message_id, user_id, reaction } = data;
            setMessageReactions(prev => {
                const oldReactions = prev[message_id] || [];
                // Удаляем старую реакцию от того же user_id (если была)
                const filtered = oldReactions.filter(r => r.user_id !== user_id);
                // Добавляем новую
                filtered.push({ user_id, reaction });
                return { ...prev, [message_id]: filtered };
            });
        };

        // Обновление уведомлений
        const handleNotificationUpdated = (data) => {
            console.log('Notification settings updated:', data);
        };

        // Обновление статуса (кто вошёл/вышел)
        const handleStatus = (data) => {
            setStatus(data.message);
            setTimeout(() => setStatus(''), 3000);
        };

        // Если сообщение удалено для всех
        const handleMessageDeletedForAll = (data) => {
            // data = { message_id }
            // Можно либо убрать сообщение из локального списка, либо снова вызвать fetchMessages()
            setMessages((prev) => prev.filter(msg => msg.id !== data.message_id));
        };

        // Если сообщение удалено только для одного юзера
        const handleMessageDeletedForUser = (data) => {
            // data = { message_id, user_id }
            // Если это текущий пользователь, убираем сообщение из локального списка
            if (data.user_id === user.id) {
                setMessages((prev) => prev.filter(msg => msg.id !== data.message_id));
            }
        };

        // Подписываемся на события
        socket.on('receive_message', handleReceiveMessage);
        socket.on('receive_reaction', handleReceiveReaction);
        socket.on('notification_updated', handleNotificationUpdated);
        socket.on('status', handleStatus);
        socket.on('message_deleted_for_all', handleMessageDeletedForAll);
        socket.on('message_deleted_for_user', handleMessageDeletedForUser);

        return () => {
            // Покидаем комнату при уходе со страницы
            socket.emit('leave', { chat_id: chatId, username: user?.username || '' });
            // Отписываемся от событий
            socket.off('receive_message', handleReceiveMessage);
            socket.off('receive_reaction', handleReceiveReaction);
            socket.off('notification_updated', handleNotificationUpdated);
            socket.off('status', handleStatus);
            socket.off('message_deleted_for_all', handleMessageDeletedForAll);
            socket.off('message_deleted_for_user', handleMessageDeletedForUser);
        };
    }, [chatId, user, fetchMessages, fetchReactions]);

    // Отправка сообщения (текст + файл)
    const sendMessage = async () => {
        if (!input && !file) return; // не отправлять пустые сообщения
        let media_filename = null;

        // Если пользователь выбрал файл, загружаем его отдельно на бэкенд
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('http://localhost:5000/upload', { method: 'POST', body: formData });
            const uploadData = await res.json();
            media_filename = uploadData.filename;
        }

        // Посылаем событие "send_message" на сокет
        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: input,
            media_filename
        });

        // Очищаем поле ввода и выбранный файл
        setInput('');
        setFile(null);
    };

    // Отправка сообщения по Enter
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    // Отправка реакции (через сокет)
    const sendReaction = (messageId, reaction) => {
        socket.emit('send_reaction', {
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            reaction
        });
        setMenuOpenForMsgId(null);
    };

    // Псевдо-функция пересылки: делаем реальный запрос к /forward_message
    const forwardMessage = async (messageId) => {
        // Попросим у пользователя ID чата, куда переслать
        const toChatId = prompt('Введите ID чата, куда переслать сообщение');
        if (!toChatId) {
            setMenuOpenForMsgId(null);
            return;
        }

        const res = await fetch('http://localhost:5000/forward_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message_id: messageId,
                to_chat_id: parseInt(toChatId, 10),
                user_id: user.id
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert('Сообщение успешно переслано!');
        } else {
            alert(`Ошибка пересылки: ${data.message}`);
        }
        setMenuOpenForMsgId(null);
    };

    // Псевдо-функция ответа (зависит от логики, здесь просто alert)
    const replyMessage = (messageId) => {
        alert(`Ответить на сообщение ID=${messageId} (не реализовано)`);
        setMenuOpenForMsgId(null);
    };

    // Удаление сообщения
    const deleteMessage = async (messageId, forAll = false) => {
        // Вызываем эндпоинт DELETE /messages/<messageId>?mode=everyone|me&user_id=<...>
        const mode = forAll ? 'everyone' : 'me';
        const url = `http://localhost:5000/messages/${messageId}?mode=${mode}&user_id=${user.id}`;
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            // Можно либо заново запросить список сообщений:
            await fetchMessages();
            // Или дождаться событий сокета "message_deleted_for_all" / "message_deleted_for_user"
            // В этом примере мы сразу обновляем по fetchMessages().
        } else {
            alert(`Ошибка удаления: ${data.message}`);
        }
        setMenuOpenForMsgId(null);
    };

    // Функция для показа/скрытия меню при клике на сообщение
    const toggleMenuForMessage = (msgId) => {
        setMenuOpenForMsgId(prev => (prev === msgId ? null : msgId));
    };

    // Функция определения как рендерить файл
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

    // Обновить настройки уведомлений
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
            <h2>TeamForge</h2>
            <button onClick={updateNotification}>
                {notification ? 'Отключить' : 'Включить'} уведомления
            </button>
            {status && <p className="status-message">{status}</p>}

            {/* Поиск сообщений */}
            <div>
                <input
                    type="search"
                    placeholder="Поиск сообщений..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button onClick={fetchMessages}>Искать</button>
            </div>

            {/* Список сообщений */}
            <div className="chat-container">
                {messages.map((msg) => (
                    <div
                        className="message"
                        key={msg.id}
                        onClick={() => toggleMenuForMessage(msg.id)}
                        style={{ position: 'relative' }}
                    >
                        <strong>Пользователь {msg.sender_id}:</strong> {msg.content}

                        {/* Если есть вложение (media_filename), отобразим его */}
                        {msg.media_filename && (
                            <div>
                                {renderMedia(msg.media_filename)}
                            </div>
                        )}

                        {/* Отобразим все реакции, которые есть у сообщения */}
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

                        {/* Контекстное меню (скрыто, пока не кликнем на сообщение) */}
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
                            >
                                <button onClick={() => sendReaction(msg.id, '👍')}>Реакция: 👍</button>
                                <button onClick={() => sendReaction(msg.id, '❤️')}>Реакция: ❤️</button>
                                <button onClick={() => forwardMessage(msg.id)}>Переслать</button>
                                <button onClick={() => replyMessage(msg.id)}>Ответить</button>
                                <button onClick={() => deleteMessage(msg.id, false)}>Удалить у себя</button>
                                <button onClick={() => deleteMessage(msg.id, true)}>Удалить у всех</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Блок ввода нового сообщения */}
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
