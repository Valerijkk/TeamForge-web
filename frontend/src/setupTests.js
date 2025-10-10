// src/setupTests.js
import '@testing-library/jest-dom';

const React = require('react');

/**
 * Мокаем react-router-dom как "виртуальный" модуль,
 * чтобы Jest не пытался его резолвить (ESM в v7 ломает CRA/Jest).
 */
jest.mock(
    'react-router-dom',
    () => ({
        __esModule: true,
        MemoryRouter: ({ children }) => React.createElement('div', { 'data-testid': 'memory-router' }, children),
        BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children),
        Routes: ({ children }) => React.createElement('div', { 'data-testid': 'routes' }, children),
        Route: ({ element, children }) => element ?? children ?? null,
        Link: ({ to, children, ...rest }) =>
            React.createElement('a', { href: typeof to === 'string' ? to : '#', ...rest }, children),
        NavLink: ({ to, children, ...rest }) =>
            React.createElement('a', { href: typeof to === 'string' ? to : '#', 'data-navlink': true, ...rest }, children),
        Navigate: ({ to }) => React.createElement('span', { 'data-navigate-to': String(to) }),
        Outlet: ({ children }) => React.createElement('div', null, children),
        useNavigate: () => () => {},
        useParams: () => ({}),
        useLocation: () => ({ pathname: '/' }),
        useSearchParams: () => [new URLSearchParams(), () => {}],
        createSearchParams: (obj) => new URLSearchParams(obj),
    }),
    { virtual: true }
);

/** Глушим socket.io-client, чтобы тесты не стучались в реальный сокет */
jest.mock(
    'socket.io-client',
    () => () => ({
        on: jest.fn(),
        emit: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
    }),
    { virtual: true }
);

/** Мокаем react-calendar: всегда рисуем элемент с role="grid" */
jest.mock(
    'react-calendar',
    () => ({
        __esModule: true,
        default: (props) => React.createElement('div', { role: 'grid', className: 'react-calendar', ...props }),
    }),
    { virtual: true }
);
