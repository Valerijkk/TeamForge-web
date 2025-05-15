import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './ChatPage.css';

// Инициализация соединения с сервером через socket.io
const socket = io('http://localhost:5000');

/* --- Утилита для очистки пользовательского ввода от опасных SQL-шаблонов и HTML --- */
function sanitizeInput(value) {
    const forbidden =
        /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    let cleaned = value.replace(forbidden, '');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    return cleaned.slice(0, 500).trim();
}

/* ========================================================================= */
function ChatPage({ user }) {
    const { chatId } = useParams();              // Получаем ID чата из URL
    const navigate   = useNavigate();

    /* --- локальное состояние для отображения и управления чатом --- */
    const [chatName, setChatName] = useState('…');               // Название чата
    const [messages, setMessages] = useState([]);                // Список сообщений
    const [input,    setInput]    = useState('');                // Поле ввода сообщения
    const [file,     setFile]     = useState(null);              // Выбранный файл для отправки
    const [search,   setSearch]   = useState('');                // Строка поиска по сообщениям
    const [notification, setNotification] = useState(true);      // Включены ли уведомления

    const [status, setStatus]                     = useState(''); // Статусы от сервера
    const [messageReactions, setMessageReactions] = useState({}); // Реакции по сообщениям
    const [menuOpenForMsgId, setMenuOpenForMsgId] = useState(null);// Открытое меню для конкретного сообщения

    // Управление модальным окном ответа
    const [replyModalOpen, setReplyModalOpen]   = useState(false);
    const [replyTargetId,  setReplyTargetId]    = useState(null);
    const [replyContent,   setReplyContent]     = useState('');

    // Управление модальным окном пересылки
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [forwardMessageId, setForwardMessageId] = useState(null);
    const [availableChats,   setAvailableChats]   = useState([]);
    const [selectedChatId,   setSelectedChatId]   = useState('');

    /* --- refs для проверки, что компонент ещё вмонтирован, и хранения таймера --- */
    const mountedRef      = useRef(true);
    const notificationRef = useRef(notification);
    const timeoutRef      = useRef(null);

    /* --- жизненный цикл компонента --- */
    // отмечаем, что компонент вмонтирован / размонтирован
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);
    // обновляем ref при смене состояния уведомлений
    useEffect(() => { notificationRef.current = notification; }, [notification]);
    // если нет пользователя — переходим на главный
    useEffect(() => { if (!user) navigate('/'); }, [user, navigate]);

    /* --- загрузка названия чата по ID --- */
    useEffect(() => {
        fetch(`http://localhost:5000/chat/${chatId}`)
            .then(r => r.json())
            .then(d => mountedRef.current && setChatName(d.name || 'Безымянный чат'))
            .catch(() => setChatName('Безымянный чат'));
    }, [chatId]);

    /* --- функция для загрузки сообщений (с поддержкой поиска) --- */
    const fetchMessages = useCallback(() => {
        const safe = sanitizeInput(search);
        let url = `http://localhost:5000/messages/${chatId}?user_id=${user.id}`;
        if (safe) url += `&q=${safe}`;

        fetch(url)
            .then(r => r.json())
            .then(d => mountedRef.current && setMessages(d))
            .catch(e => console.error('Ошибка при загрузке сообщений:', e));
    }, [chatId, search, user.id]);

    /* --- загрузка списка чатов пользователя для пересылки сообщений --- */
    const fetchUserChats = useCallback(() => {
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(r => r.json())
            .then(d => mountedRef.current && setAvailableChats(d))
            .catch(e => console.error(e));
    }, [user.id]);

    /* --- работа с сокетами: подключение, слушатели и отписка --- */
    useEffect(() => {
        // присоединяемся к комнате чата
        socket.emit('join', { chat_id: chatId, username: user?.username || '' });
        fetchMessages();
        fetchUserChats();

        // обработчики событий
        const onReceiveMessage = (d) => {
            mountedRef.current && setMessages(prev => [...prev, d]);
            // показываем системное уведомление, если разрешено
            if (notificationRef.current && d.sender_id !== user.id) {
                const show = () => new Notification('Новое сообщение', { body: d.content });
                if (Notification.permission === 'granted') show();
                else if (Notification.permission !== 'denied')
                    Notification.requestPermission().then(p => p === 'granted' && show());
            }
        };
        const onReceiveReaction = ({ message_id, user_id, reaction }) => {
            mountedRef.current && setMessageReactions(prev => {
                const arr = (prev[message_id] || []).filter(r => r.user_id !== user_id);
                arr.push({ user_id, reaction });
                return { ...prev, [message_id]: arr };
            });
        };
        const onStatus = (d) => {
            mountedRef.current && setStatus(d.message);
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(
                () => mountedRef.current && setStatus(''),
                3000,
            );
        };
        const onDeletedForAll = ({ message_id }) =>
            mountedRef.current && setMessages(p => p.filter(m => m.id !== message_id));
        const onDeletedForUser = ({ message_id, user_id }) =>
            mountedRef.current && user_id === user.id &&
            setMessages(p => p.filter(m => m.id !== message_id));

        // подписываемся
        socket.on('receive_message',          onReceiveMessage);
        socket.on('receive_reaction',         onReceiveReaction);
        socket.on('status',                   onStatus);
        socket.on('message_deleted_for_all',  onDeletedForAll);
        socket.on('message_deleted_for_user', onDeletedForUser);

        // отписываемся при размонтировании или смене зависимостей
        return () => {
            socket.emit('leave', { chat_id: chatId, username: user?.username || '' });
            socket.off('receive_message',          onReceiveMessage);
            socket.off('receive_reaction',         onReceiveReaction);
            socket.off('status',                   onStatus);
            socket.off('message_deleted_for_all',  onDeletedForAll);
            socket.off('message_deleted_for_user', onDeletedForUser);
            clearTimeout(timeoutRef.current);
        };
    }, [chatId, user, fetchMessages, fetchUserChats]);

    /* --- отправка сообщения (текст или файл) через сокет --- */
    const sendMessage = async () => {
        const safe = sanitizeInput(input);
        if (!safe && !file) return;

        let media_filename = null;
        if (file) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                const resp = await fetch('http://localhost:5000/upload', { method: 'POST', body: fd });
                media_filename = (await resp.json()).filename;
            } catch (e) {
                console.error('Ошибка загрузки файла:', e);
                return;
            }
        }

        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: safe,
            media_filename,
        });

        setInput('');
        setFile(null);
    };

    // Отправка по нажатию Enter
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    };

    /* --- отправка реакции на сообщение --- */
    const sendReaction = (messageId, reaction) => {
        socket.emit('send_reaction', {
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            reaction,
        });
        setMenuOpenForMsgId(null);
    };

    /* --- логика для модального окна пересылки сообщения --- */
    const openForwardModal  = (id) => { setForwardMessageId(id); setForwardModalOpen(true);  setMenuOpenForMsgId(null); };
    const closeForwardModal = ()   => { setForwardModalOpen(false); setForwardMessageId(null); setSelectedChatId(''); };

    const confirmForward = async () => {
        if (!selectedChatId || !forwardMessageId) return;
        try {
            const r = await fetch('http://localhost:5000/forward_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_id: forwardMessageId,
                    to_chat_id: +selectedChatId,
                    user_id: user.id,
                }),
            });
            const d = await r.json();
            if (d.status !== 'success')
                console.error(`Ошибка пересылки: ${d.message}`);
        } catch (e) { console.error('Ошибка пересылки:', e); }
        closeForwardModal();
    };

    /* --- логика для модального окна ответа на сообщение --- */
    const openReplyModal  = (id) => { setReplyTargetId(id); setReplyContent(''); setReplyModalOpen(true); setMenuOpenForMsgId(null); };
    const closeReplyModal = ()   => { setReplyModalOpen(false); setReplyTargetId(null); setReplyContent(''); };

    const confirmReply = () => {
        if (!replyTargetId) return;
        const safe = sanitizeInput(replyContent);
        socket.emit('send_message', {
            chat_id: chatId,
            sender_id: user.id,
            content: safe,
            media_filename: null,
            reply_to_id: replyTargetId,
        });
        closeReplyModal();
    };

    /* --- удаление сообщения для себя или для всех --- */
    const deleteMessage = async (messageId, forAll = false) => {
        const mode = forAll ? 'everyone' : 'me';
        try {
            const r = await fetch(
                `http://localhost:5000/messages/${messageId}?mode=${mode}&user_id=${user.id}`,
                { method: 'DELETE' },
            );
            const d = await r.json();
            if (d.status === 'success') fetchMessages();
            else console.error(`Ошибка удаления: ${d.message}`);
        } catch (e) { console.error('Ошибка удаления сообщения:', e); }
        setMenuOpenForMsgId(null);
    };

    // Открыть или закрыть контекстное меню для конкретного сообщения
    const toggleMenuForMessage = (id) =>
        setMenuOpenForMsgId(prev => (prev === id ? null : id));

    /* --- отрисовка медиа в сообщении (картинка, PDF или файл) --- */
    const renderMedia = (filename) => {
        if (!filename) return null;
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext))
            return <img src={`http://localhost:5000/uploads/${filename}`} alt="media" />;
        if (ext === 'pdf')
            return (
                <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">
                    Посмотреть PDF
                </a>
            );
        return (
            <a href={`http://localhost:5000/uploads/${filename}`} target="_blank" rel="noreferrer">
                Скачать файл
            </a>
        );
    };

    // Нахождение оригинального сообщения при отображении ответов
    const findOriginalMessage = (id) =>
        messages.find(m => m.id === id) || null;

    /* ---------------------------------------------------------------------- */
    return (
        <div className="chat-page">
            {/* ---------------- HEADER ---------------- */}
            <header className="chat-header">
                <button className="back-button" onClick={() => navigate('/chats')}>
                    ← Назад
                </button>

                <h2 className="chat-title">{chatName}</h2>

                <button
                    className="notify-toggle"
                    onClick={() => {
                        setNotification(!notification);
                        socket.emit('update_notification', {
                            chat_id: chatId,
                            user_id: user.id,
                            notifications_enabled: !notification,
                        });
                    }}
                >
                    {notification ? '🔔 выкл.' : '🔔 вкл.'}
                </button>
            </header>

            {status && <p className="status-message">{status}</p>}

            {/* ---------------- SEARCH ---------------- */}
            <div className="search-bar">
                <input
                    type="search"
                    placeholder="Поиск сообщений…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button onClick={fetchMessages}>Искать</button>
            </div>

            {/* ---------------- MESSAGES -------------- */}
            <div className="chat-container">
                {messages.map(msg => {
                    const original = msg.reply_to_id ? findOriginalMessage(msg.reply_to_id) : null;

                    return (
                        <div
                            key={msg.id}
                            className="message"
                            onClick={() => toggleMenuForMessage(msg.id)}
                        >
                            {msg.forwarded_from_id && (
                                <div className="forwarded-label">
                                    Переслано от пользователя {msg.forwarded_from_id}
                                </div>
                            )}

                            {msg.reply_to_id && (
                                <div className="reply-label">
                                    Ответ на сообщение #{msg.reply_to_id}{' '}
                                    {original && (
                                        <em>(
                                            {original.content
                                                ? original.content.slice(0, 30)
                                                : '…'}
                                            …)
                                        </em>
                                    )}
                                </div>
                            )}

                            <strong className="message-sender">
                                Пользователь {msg.sender_id}:
                            </strong>
                            <span className="message-text"> {msg.content}</span>

                            {msg.media_filename && (
                                <div className="message-media">{renderMedia(msg.media_filename)}</div>
                            )}

                            {messageReactions[msg.id]?.length > 0 && (
                                <div className="reactions-block">
                                    {messageReactions[msg.id].map((r, i) => (
                                        <div key={i} className="reaction-item">
                                            Пользователь {r.user_id} поставил {r.reaction}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="message-timestamp small-text">
                                {new Date(msg.timestamp + 'Z').toLocaleString()}
                            </div>

                            {menuOpenForMsgId === msg.id && (
                                <div className="message-menu" onClick={e => e.stopPropagation()}>
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

            {/* ---------------- FOOTER --------------- */}
            <footer className="chat-footer">
                <input
                    className="chat-input-text"
                    type="text"
                    placeholder="Введите сообщение…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <input
                    className="chat-input-file"
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                />
                <button className="send-button" onClick={sendMessage}>
                    Отправить
                </button>
            </footer>

            {/* ---------------- MODALS ---------------- */}
            {forwardModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Переслать сообщение</h3>
                        <p>Выберите чат, куда переслать сообщение #{forwardMessageId}:</p>
                        <select value={selectedChatId} onChange={e => setSelectedChatId(e.target.value)}>
                            <option value="">-- Выберите чат --</option>
                            {availableChats.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} (ID: {c.id})
                                </option>
                            ))}
                        </select>
                        <div className="modal-actions">
                            <button onClick={confirmForward}>Переслать</button>
                            <button onClick={closeForwardModal}>Отмена</button>
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
                            placeholder="Введите ваш ответ…"
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button onClick={confirmReply}>Отправить</button>
                            <button onClick={closeReplyModal}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default ChatPage;