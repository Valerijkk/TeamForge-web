import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import Chat from './Chat';
import ChatList from './ChatList';

function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [activeChat, setActiveChat] = useState(null);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const logout = () => {
        setUser(null);
        setActiveChat(null);
    };

    if (!user) {
        return (
            <div style={{ padding: 20 }}>
                <h2>Messenger</h2>
                <Login setUser={setUser} />
                <hr />
                <Register setUser={setUser} />
            </div>
        );
    }

    if (!activeChat) {
        return (
            <div style={{ padding: 20 }}>
                <h2>Welcome, {user.username}</h2>
                <button onClick={logout}>Logout</button>
                <ChatList user={user} setActiveChat={setActiveChat} />
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <button onClick={logout}>Logout</button>
            <Chat user={user} chat={activeChat} goBack={() => setActiveChat(null)} />
        </div>
    );
}

export default App;
