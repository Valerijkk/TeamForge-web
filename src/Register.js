import React, { useState } from 'react';

function Register({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const registerAndLogin = async () => {
        try {
            const res = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            console.log("Registration response:", data);
            if (data.status === 'success') {
                const loginRes = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const loginData = await loginRes.json();
                console.log("Login response:", loginData);
                if (loginData.status === 'success') {
                    setUser({ id: loginData.user_id, username });
                } else {
                    alert('Login failed: ' + loginData.message);
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error during registration:", error);
        }
    };

    return (
        <div>
            <h3>Register</h3>
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
            <button onClick={registerAndLogin}>Register</button>
        </div>
    );
}

export default Register;
