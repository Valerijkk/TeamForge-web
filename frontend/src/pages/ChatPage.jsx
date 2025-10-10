import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import "./ChatPage.css";

/** Базовый адрес API (можно переопределить через переменную окружения) */
const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

/** Один сокет на файл (страница), явные опции транспорта для стабильности */
const socket = io(BASE_URL, {
    transports: ["websocket"],
    withCredentials: true,
});

/* --- Небольшой санитайзер текста (без фанатизма) --- */
function sanitizeInput(value) {
    if (!value) return "";
    // вырежем самые грубые SQL-паттерны
    const forbidden =
        /(?:\b)drop\s+table|delete\s+from|truncate\s+table|update\s+.+?\s+set|insert\s+into|select\s+.+?\s+from/gi;
    let cleaned = String(value).replace(forbidden, "");
    // удалим HTML-теги
    cleaned = cleaned.replace(/<[^>]*>/g, "");
    return cleaned.slice(0, 2000).trim(); // позволим чуть больше символов
}

function useAbortableFetch() {
    const controllerRef = useRef(null);
    useEffect(() => () => controllerRef.current?.abort(), []);
    return useMemo(
        () => ({
            nextController() {
                controllerRef.current?.abort();
                controllerRef.current = new AbortController();
                return controllerRef.current.signal;
            },
            abort() {
                controllerRef.current?.abort();
            },
        }),
        []
    );
}

/* ========================================================================= */
function ChatPage({ user }) {
    const { chatId } = useParams(); // ID чата из URL
    const navigate = useNavigate();

    /* --- локальное состояние --- */
    const [chatName, setChatName] = useState("…");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [file, setFile] = useState(null);
    const [search, setSearch] = useState("");
    const [notification, setNotification] = useState(true);

    const [status, setStatus] = useState("");
    const [messageReactions, setMessageReactions] = useState({});
    const [menuOpenForMsgId, setMenuOpenForMsgId] = useState(null);

    // модалки «ответ» и «переслать»
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [replyTargetId, setReplyTargetId] = useState(null);
    const [replyContent, setReplyContent] = useState("");

    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [forwardMessageId, setForwardMessageId] = useState(null);
    const [availableChats, setAvailableChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState("");

    // загрузочные состояния / ошибки
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");

    /* --- refs --- */
    const mountedRef = useRef(true);
    const notificationRef = useRef(notification);
    const timeoutRef = useRef(null);
    const bottomRef = useRef(null); // для автоскролла

    const abortable = useAbortableFetch();

    /* --- side effects --- */
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            abortable.abort();
            clearTimeout(timeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        notificationRef.current = notification;
    }, [notification]);

    useEffect(() => {
        if (!user) navigate("/");
    }, [user, navigate]);

    /* --- форматирование времени --- */
    const formatTS = (ts) => {
        if (!ts) return "";
        // нормализуем к ISO с Z (если сервер присылает без Z)
        const iso = /Z$/.test(ts) ? ts : `${ts}Z`;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString();
    };

    /* --- загрузка названия чата --- */
    useEffect(() => {
        const signal = abortable.nextController();
        (async () => {
            try {
                setLoadError("");
                const r = await fetch(`${BASE_URL}/chat/${chatId}`, { signal });
                const d = await r.json();
                if (!mountedRef.current) return;
                setChatName(d?.name || "Безымянный чат");
            } catch {
                if (!mountedRef.current) return;
                setChatName("Безымянный чат");
            }
        })();
    }, [chatId, abortable]);

    /* --- загрузка сообщений --- */
    const fetchMessages = useCallback(async () => {
        const safe = sanitizeInput(search);
        const signal = abortable.nextController();
        const u = new URL(`${BASE_URL}/messages/${chatId}`);
        u.searchParams.set("user_id", user.id);
        if (safe) u.searchParams.set("q", safe);

        try {
            setLoading(true);
            setLoadError("");
            const r = await fetch(u.toString(), { signal });
            const d = await r.json();
            if (!mountedRef.current) return;
            setMessages(Array.isArray(d) ? d : []);
            // небольшой авто-скролл вниз после загрузки
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
        } catch (e) {
            if (!mountedRef.current) return;
            console.error("Ошибка при загрузке сообщений:", e);
            setLoadError("Не удалось загрузить сообщения. Попробуйте позже.");
        } finally {
            setLoading(false);
        }
    }, [abortable, chatId, search, user?.id]);

    /* --- загрузка списка чатов для пересылки --- */
    const fetchUserChats = useCallback(async () => {
        const signal = abortable.nextController();
        try {
            const r = await fetch(`${BASE_URL}/user_chats/${user.id}`, { signal });
            const d = await r.json();
            if (!mountedRef.current) return;
            setAvailableChats(Array.isArray(d) ? d : []);
        } catch (e) {
            console.error(e);
        }
    }, [abortable, user?.id]);

    /* --- работа с сокетами --- */
    useEffect(() => {
        if (!user) return;

        socket.emit("join", { chat_id: chatId, username: user?.username || "" });
        fetchMessages();
        fetchUserChats();

        const onReceiveMessage = (d) => {
            if (!mountedRef.current) return;
            setMessages((prev) => [...prev, d]);
            // автоскролл
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);

            // системное уведомление
            try {
                if (notificationRef.current && d.sender_id !== user.id && "Notification" in window) {
                    const show = () =>
                        new Notification("Новое сообщение", { body: d.content || "Вложение", silent: true });
                    if (Notification.permission === "granted") show();
                    else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then((p) => p === "granted" && show());
                    }
                }
            } catch {
                /* no-op */
            }
        };

        const onReceiveReaction = ({ message_id, user_id, reaction }) => {
            if (!mountedRef.current) return;
            setMessageReactions((prev) => {
                const arr = (prev[message_id] || []).filter((r) => r.user_id !== user_id);
                arr.push({ user_id, reaction });
                return { ...prev, [message_id]: arr };
            });
        };

        const onStatus = (d) => {
            if (!mountedRef.current) return;
            setStatus(d?.message || "");
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                if (!mountedRef.current) return;
                setStatus("");
            }, 3000);
        };

        const onDeletedForAll = ({ message_id }) => {
            if (!mountedRef.current) return;
            setMessages((p) => p.filter((m) => m.id !== message_id));
        };

        const onDeletedForUser = ({ message_id, user_id }) => {
            if (!mountedRef.current || user_id !== user.id) return;
            setMessages((p) => p.filter((m) => m.id !== message_id));
        };

        socket.on("receive_message", onReceiveMessage);
        socket.on("receive_reaction", onReceiveReaction);
        socket.on("status", onStatus);
        socket.on("message_deleted_for_all", onDeletedForAll);
        socket.on("message_deleted_for_user", onDeletedForUser);

        return () => {
            socket.emit("leave", { chat_id: chatId, username: user?.username || "" });
            socket.off("receive_message", onReceiveMessage);
            socket.off("receive_reaction", onReceiveReaction);
            socket.off("status", onStatus);
            socket.off("message_deleted_for_all", onDeletedForAll);
            socket.off("message_deleted_for_user", onDeletedForUser);
            clearTimeout(timeoutRef.current);
        };
    }, [chatId, user, fetchMessages, fetchUserChats]);

    /* --- отправка сообщения (текст/файл) --- */
    const sendMessage = async () => {
        const safe = sanitizeInput(input);
        if (!safe && !file) return;

        let media_filename = null;

        if (file) {
            try {
                const fd = new FormData();
                fd.append("file", file);
                const resp = await fetch(`${BASE_URL}/upload`, { method: "POST", body: fd });
                const payload = await resp.json();
                media_filename = payload?.filename || null;
            } catch (e) {
                console.error("Ошибка загрузки файла:", e);
                return;
            }
        }

        socket.emit("send_message", {
            chat_id: chatId,
            sender_id: user.id,
            content: safe,
            media_filename,
        });

        setInput("");
        setFile(null);
        // моментальный скролл вниз
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    };

    // Enter = отправить
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    /* --- реакции --- */
    const sendReaction = (messageId, reaction) => {
        socket.emit("send_reaction", {
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            reaction,
        });
        setMenuOpenForMsgId(null);
    };

    /* --- пересылка --- */
    const openForwardModal = (id) => {
        setForwardMessageId(id);
        setForwardModalOpen(true);
        setMenuOpenForMsgId(null);
    };
    const closeForwardModal = () => {
        setForwardModalOpen(false);
        setForwardMessageId(null);
        setSelectedChatId("");
    };

    const confirmForward = async () => {
        if (!selectedChatId || !forwardMessageId) return;
        try {
            const r = await fetch(`${BASE_URL}/forward_message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message_id: forwardMessageId,
                    to_chat_id: +selectedChatId,
                    user_id: user.id,
                }),
            });
            const d = await r.json();
            if (d.status !== "success") console.error(`Ошибка пересылки: ${d.message}`);
        } catch (e) {
            console.error("Ошибка пересылки:", e);
        }
        closeForwardModal();
    };

    /* --- ответ --- */
    const openReplyModal = (id) => {
        setReplyTargetId(id);
        setReplyContent("");
        setReplyModalOpen(true);
        setMenuOpenForMsgId(null);
    };
    const closeReplyModal = () => {
        setReplyModalOpen(false);
        setReplyTargetId(null);
        setReplyContent("");
    };

    const confirmReply = () => {
        if (!replyTargetId) return;
        const safe = sanitizeInput(replyContent);
        if (!safe) return;
        socket.emit("send_message", {
            chat_id: chatId,
            sender_id: user.id,
            content: safe,
            media_filename: null,
            reply_to_id: replyTargetId,
        });
        closeReplyModal();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    };

    /* --- удаление --- */
    const deleteMessage = async (messageId, forAll = false) => {
        const mode = forAll ? "everyone" : "me";
        try {
            const r = await fetch(
                `${BASE_URL}/messages/${messageId}?mode=${mode}&user_id=${user.id}`,
                { method: "DELETE" }
            );
            const d = await r.json();
            if (d.status === "success") fetchMessages();
            else console.error(`Ошибка удаления: ${d.message}`);
        } catch (e) {
            console.error("Ошибка удаления сообщения:", e);
        }
        setMenuOpenForMsgId(null);
    };

    const toggleMenuForMessage = (id) =>
        setMenuOpenForMsgId((prev) => (prev === id ? null : id));

    const renderMedia = (filename) => {
        if (!filename) return null;
        const ext = filename.split(".").pop().toLowerCase();
        const href = `${BASE_URL}/uploads/${filename}`;
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
            return <img src={href} alt="вложение" loading="lazy" />;
        }
        if (ext === "pdf")
            return (
                <a href={href} target="_blank" rel="noreferrer">
                    Посмотреть PDF
                </a>
            );
        return (
            <a href={href} target="_blank" rel="noreferrer">
                Скачать файл
            </a>
        );
    };

    const findOriginalMessage = (id) => messages.find((m) => m.id === id) || null;

    /* ---------------------------------------------------------------------- */
    return (
        <div className="chat-page">
            {/* ---------------- HEADER ---------------- */}
            <header className="chat-header">
                <button className="back-button" onClick={() => navigate("/chats")}>
                    ← Назад
                </button>

                <h2 className="chat-title" title={`Чат #${chatId}`}>
                    {chatName}
                </h2>

                <button
                    className="notify-toggle"
                    onClick={() => {
                        setNotification((v) => !v);
                        socket.emit("update_notification", {
                            chat_id: chatId,
                            user_id: user.id,
                            notifications_enabled: !notification,
                        });
                    }}
                    aria-pressed={notification}
                    title={notification ? "Выключить уведомления" : "Включить уведомления"}
                >
                    {notification ? "🔔 выкл." : "🔔 вкл."}
                </button>
            </header>

            {!!status && (
                <p className="status-message" aria-live="polite">
                    {status}
                </p>
            )}

            {/* ---------------- SEARCH ---------------- */}
            <div className="search-bar">
                <input
                    type="search"
                    placeholder="Поиск сообщений…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchMessages()}
                    aria-label="Поиск по сообщениям"
                />
                <button onClick={fetchMessages} disabled={loading}>
                    {loading ? "Ищу…" : "Искать"}
                </button>
            </div>

            {loadError && <div className="error-inline">{loadError}</div>}

            {/* ---------------- MESSAGES -------------- */}
            <div className="chat-container">
                {messages.map((msg) => {
                    const original = msg.reply_to_id ? findOriginalMessage(msg.reply_to_id) : null;

                    return (
                        <div
                            key={msg.id}
                            className="message"
                            onClick={() => toggleMenuForMessage(msg.id)}
                            tabIndex={0}
                            role="article"
                            aria-label={`Сообщение от пользователя ${msg.sender_id}`}
                        >
                            {msg.forwarded_from_id && (
                                <div className="forwarded-label">
                                    Переслано от пользователя {msg.forwarded_from_id}
                                </div>
                            )}

                            {msg.reply_to_id && (
                                <div className="reply-label">
                                    Ответ на сообщение #{msg.reply_to_id}{" "}
                                    {original && (
                                        <em>
                                            ({original.content ? original.content.slice(0, 50) : "…"}…)
                                        </em>
                                    )}
                                </div>
                            )}

                            <strong className="message-sender">Пользователь {msg.sender_id}:</strong>
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

                            <div className="message-timestamp small-text">{formatTS(msg.timestamp)}</div>

                            {menuOpenForMsgId === msg.id && (
                                <div className="message-menu" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => sendReaction(msg.id, "👍")}>Реакция: 👍</button>
                                    <button onClick={() => sendReaction(msg.id, "❤️")}>Реакция: ❤️</button>
                                    <button onClick={() => openForwardModal(msg.id)}>Переслать</button>
                                    <button onClick={() => openReplyModal(msg.id)}>Ответить</button>
                                    <button onClick={() => deleteMessage(msg.id, false)}>Удалить у себя</button>
                                    <button onClick={() => deleteMessage(msg.id, true)}>Удалить у всех</button>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* ---------------- FOOTER --------------- */}
            <footer className="chat-footer">
        <textarea
            className="chat-input-text"
            rows={2}
            placeholder="Введите сообщение… (Shift+Enter — перенос строки)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Поле ввода сообщения"
        />
                <input
                    className="chat-input-file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    aria-label="Прикрепить файл"
                />
                <button className="send-button" onClick={sendMessage} disabled={!input.trim() && !file}>
                    Отправить
                </button>
            </footer>

            {/* ---------------- MODALS ---------------- */}
            {forwardModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-content">
                        <h3>Переслать сообщение</h3>
                        <p>Выберите чат, куда переслать сообщение #{forwardMessageId}:</p>
                        <select
                            value={selectedChatId}
                            onChange={(e) => setSelectedChatId(e.target.value)}
                            aria-label="Выбор чата для пересылки"
                        >
                            <option value="">-- Выберите чат --</option>
                            {availableChats.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} (ID: {c.id})
                                </option>
                            ))}
                        </select>
                        <div className="modal-actions">
                            <button onClick={confirmForward} disabled={!selectedChatId}>
                                Переслать
                            </button>
                            <button onClick={closeForwardModal}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}

            {replyModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-content">
                        <h3>Ответ на сообщение #{replyTargetId}</h3>
                        <textarea
                            rows="4"
                            placeholder="Введите ваш ответ…"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button onClick={confirmReply} disabled={!replyContent.trim()}>
                                Отправить
                            </button>
                            <button onClick={closeReplyModal}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default ChatPage;
