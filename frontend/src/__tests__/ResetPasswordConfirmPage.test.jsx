import React from 'react';
import { render } from '@testing-library/react';
import ResetPasswordConfirmPage from '../pages/ResetPasswordConfirmPage';

test('ResetPasswordConfirmPage рендерится без ошибок', () => {
    render(<ResetPasswordConfirmPage />);
});
