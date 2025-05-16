import React from 'react';
import { render, screen } from '@testing-library/react';
import CalendarPage from '../pages/CalendarPage';

test('CalendarPage рендерится и содержит календарь', () => {
    render(<CalendarPage />);
    // предположим, что на странице есть элемент с классом react-calendar
    expect(screen.getByRole('grid')).toBeInTheDocument();
});
