/* pages/ProfilePage.jsx */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ProfilePage({ user, onLogout }) {
    const [chatsCount, setChatsCount] = useState(0);
    const [messagesCount, setMessagesCount] = useState(0);
    const [docs, setDocs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        fetch(`http://localhost:5000/profile_data/${user.id}`)
            .then(res => res.json())
            .then(data => {
                setChatsCount(data.chats_count);
                setMessagesCount(data.messages_count);
                setDocs(data.docs);
            });
    }, [user, navigate]);

    if (!user) {
        return null;
    }

    return (
        <div className="profile-container">
            <h2>Профиль пользователя</h2>
            <p><strong>Имя пользователя:</strong> {user.username}</p>
            <p><strong>Количество чатов:</strong> {chatsCount}</p>
            <p><strong>Количество сообщений:</strong> {messagesCount}</p>

            <p><strong>Отправленные документы:</strong></p>
            {docs.length === 0 ? (
                <p>Нет загруженных документов</p>
            ) : (
                <ul>
                    {docs.map((doc, index) => (
                        <li key={index}>
                            <a
                                href={`http://localhost:5000/uploads/${doc}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {doc}
                            </a>
                        </li>
                    ))}
                </ul>
            )}

            {/* Кнопка «Выйти» теперь только здесь */}
            <button onClick={onLogout}>Выйти</button>
        </div>
    );
}

export default ProfilePage;
