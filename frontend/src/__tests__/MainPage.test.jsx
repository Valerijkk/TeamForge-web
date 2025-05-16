import React from 'react';
import { render } from '@testing-library/react';
import MainPage from '../pages/MainPage';

test('MainPage рендерится без ошибок', () => {
    render(<MainPage />);
});
