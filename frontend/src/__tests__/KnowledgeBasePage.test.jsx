import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KnowledgeBasePage from '../pages/KnowledgeBasePage';

test('KnowledgeBasePage рендерится и открывает/закрывает статью', () => {
    render(<KnowledgeBasePage />);
    // заголовок
    expect(screen.getByText('База знаний')).toBeInTheDocument();

    // первая кнопка «Подробнее»
    const moreBtn = screen.getAllByText('Подробнее')[0];
    expect(moreBtn).toBeInTheDocument();

    // при клике она меняется на «Свернуть»
    fireEvent.click(moreBtn);
    expect(screen.getByText('Свернуть')).toBeInTheDocument();
});
