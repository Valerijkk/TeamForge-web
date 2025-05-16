import React from 'react';
import { render } from '@testing-library/react';
import CallsPage from '../pages/CallsPage';

test('CallsPage рендерится без ошибок', () => {
    render(<CallsPage />);
});
