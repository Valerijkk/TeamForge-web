import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    Container,
    Typography,
    TextField,
    Button,
    Alert,
    Box,
} from "@mui/material";

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
            setResult({
                type: "error",
                text: "Не удалось отправить письмо. Попробуйте позже.",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ mt: 8 }}>
            <Typography variant="h4" gutterBottom>
                Сброс пароля
            </Typography>

            <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResetRequest()}
                aria-label="Email для восстановления"
            />

            <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={sending}
                sx={{ mt: 2 }}
                onClick={handleResetRequest}
            >
                {sending ? "Отправляю…" : "Отправить инструкцию"}
            </Button>

            {!!result.text && (
                <Alert
                    severity={result.type === "error" ? "error" : "success"}
                    sx={{ mt: 2 }}
                >
                    {result.text}
                </Alert>
            )}

            <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                    Вернуться к <RouterLink to="/login">Входу</RouterLink>
                </Typography>
            </Box>
        </Container>
    );
}

export default ResetPasswordPage;
