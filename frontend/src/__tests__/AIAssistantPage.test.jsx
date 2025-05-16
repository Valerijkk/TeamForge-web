import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../store';
import AIAssistantPage from '../pages/AIAssistantPage';

test('AIAssistantPage рендерится без ошибок', () => {
    render(
        <Provider store={store}>
            <MemoryRouter>
                <AIAssistantPage />
            </MemoryRouter>
        </Provider>
    );
});
