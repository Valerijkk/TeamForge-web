import React, { useState } from "react";
import { Link } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function ResetPasswordPage() {
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState({ type: "", text: "" });

    const handleResetRequest = async () => {
        const value = email.trim();
        if (!value) {
            setResult({ type: "error", text: "Введите ваш email" });
            return;
        }
        setSending(true);
        setResult({ type: "", text: "" });
        try {
            const res = await fetch(`${BASE_URL}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: value }),
            });
            const data = await res.json();
            setResult({
                type: res.ok ? "ok" : "error",
                text: data?.message || (res.ok ? "Письмо отправлено" : "Ошибка"),
            });
        } catch (error) {
            console.error("Ошибка при запросе сброса пароля:", error);
            setResult({ type: "error", text: "Не удалось отправить письмо. Попробуйте позже." });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="container">
            <h2>Сброс пароля</h2>
            <div className="form-group">
                <input
                    type="email"
                    placeholder="Введите ваш email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResetRequest()}
                    aria-label="Email для восстановления"
                />
            </div>
            <button onClick={handleResetRequest} disabled={sending}>
                {sending ? "Отправляю…" : "Отправить инструкцию"}
            </button>

            {result.text && (
                <div className={result.type === "error" ? "error-inline" : "success-inline"}>
                    {result.text}
                </div>
            )}

            <p style={{ marginTop: 12 }}>
                Вернуться к <Link to="/login">Входу</Link>
            </p>
        </div>
    );
}

export default ResetPasswordPage;
