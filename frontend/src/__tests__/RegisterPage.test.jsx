import React from 'react';
import { render, screen } from '@testing-library/react';
import RegisterPage from '../pages/RegisterPage';

test('RegisterPage рендерится и содержит форму регистрации', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /зарегистрироваться/i })).toBeInTheDocument();
});
