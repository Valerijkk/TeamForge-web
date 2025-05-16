import React from 'react';
import { render, screen } from '@testing-library/react';
import ResetPasswordPage from '../pages/ResetPasswordPage';

test('ResetPasswordPage рендерится и имеет поле e-mail', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
