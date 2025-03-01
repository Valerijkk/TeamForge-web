import React, { useState } from 'react';

function Login({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const login = async () => {
        const res = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.status === 'success') {
            setUser({ id: data.user_id, username });
        } else {
            alert(data.message);
        }
    };

    return (
        <div>
            <h3>Login</h3>
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
            /><br/>
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            /><br/>
            <button onClick={login}>Login</button>
        </div>
    );
}

export default Login;
