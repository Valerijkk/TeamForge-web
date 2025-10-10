// AIAssistantPage.jsx
import React from 'react';
import { Container, Typography, Box } from '@mui/material';

function AIAssistantPage() {
    return (
        <Container sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>ИИ Помощник</Typography>
            <Box sx={{ width: '100%', height: 800 }}>
                <iframe
                    src="https://www.blackbox.ai/"
                    title="ИИ Помощник"
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                />
            </Box>
        </Container>
    );
}

export default AIAssistantPage;
