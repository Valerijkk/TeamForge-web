import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ChatPage from '../pages/ChatPage';

test('ChatPage рендерится без ошибок (при наличии param id)', () => {
    render(
        <MemoryRouter initialEntries={['/chat/123']}>
            <Routes>
                <Route path="/chat/:id" element={<ChatPage />} />
            </Routes>
        </MemoryRouter>
    );
});
