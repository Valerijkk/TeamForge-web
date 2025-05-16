import React from 'react';
import { render } from '@testing-library/react';
import ChatsPage from '../pages/ChatsPage';

test('ChatsPage рендерится без ошибок', () => {
    render(<ChatsPage />);
});
