// frontend/src/setupTests.js
import '@testing-library/jest-dom';

// Мокаем react-router-dom (ESM в v7 может не перевариваться Jest'ом в CRA)
jest.mock('react-router-dom', () => {
    const React = require('react');
    return {
        __esModule: true,
        // Простейшие заглушки, достаточные для твоих тестов
        MemoryRouter: ({ children }) => React.createElement('div', { 'data-testid': 'memory-router' }, children),
        Routes: ({ children }) => React.createElement('div', { 'data-testid': 'routes' }, children),
        Route: ({ element, children }) => element ?? children ?? null,
        Link: ({ to, children, ...rest }) =>
            React.createElement('a', { href: typeof to === 'string' ? to : '#', ...rest }, children),
        NavLink: ({ to, children, ...rest }) =>
            React.createElement('a', { href: typeof to === 'string' ? to : '#', ...rest }, children),
        Outlet: ({ children }) => React.createElement('div', null, children),
        useNavigate: () => () => {},
        useParams: () => ({}),
        useLocation: () => ({ pathname: '/' }),
        useSearchParams: () => [new URLSearchParams(), () => {}],
    };
});

// Мокаем socket.io-client, чтобы тесты не коннектились в реальный сокет
jest.mock('socket.io-client', () => {
    return () => ({
        on: jest.fn(),
        emit: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
    });
});

// Мокаем react-calendar, чтобы всегда был элемент с role="grid" (закрывает падение CalendarPage теста без логина)
jest.mock('react-calendar', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: (props) => React.createElement('div', { role: 'grid', className: 'react-calendar', ...props }),
    };
});
