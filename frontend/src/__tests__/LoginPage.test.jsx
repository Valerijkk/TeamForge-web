import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';

test('LoginPage рендерится и содержит форму входа', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
});
