// MainPage.jsx
import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function MainPage() {
    return (
        <Container sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h2" gutterBottom>TeamForge</Typography>
            <Typography variant="body1" gutterBottom>
                Чат для программистов — общайтесь, делитесь файлами, создавайте команды и воплощайте идеи!
            </Typography>
            <Button variant="contained" color="primary" size="large" component={RouterLink} to="/register">
                Начать сейчас
            </Button>
        </Container>
    );
}

export default MainPage;
