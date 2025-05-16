import React from 'react';
import { render } from '@testing-library/react';
import SoftwarePage from '../pages/SoftwarePage';

test('SoftwarePage рендерится без ошибок', () => {
    render(<SoftwarePage />);
});
