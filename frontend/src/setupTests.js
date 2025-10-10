/* eslint-disable */
import '@testing-library/jest-dom';

// react-router-dom v7 — чистый ESM. Делаем ВИРТУАЛЬНЫЙ мок,
// чтобы Jest не пытался резолвить реальный пакет.
jest.mock(
    'react-router-dom',
    () => {
        const mockNavigate = jest.fn();
        return {
            __esModule: true,
            // Простые "пасс-тру" компоненты: возвращают детей/элемент без JSX
            MemoryRouter: ({ children }) => (children ?? null),
            BrowserRouter: ({ children }) => (children ?? null),
            Routes: ({ children }) => (children ?? null),
            Route: ({ element, children }) => (element ?? children ?? null),
            Link: ({ children }) => (children ?? null),
            NavLink: ({ children }) => (children ?? null),
            Outlet: ({ children }) => (children ?? null),

            // Минимальные заглушки хуков
            useNavigate: () => mockNavigate,
            useParams: () => ({}),
            useLocation: () => ({ pathname: '/' }),
        };
    },
    { virtual: true }
);

// Отключаем реальные сокеты в тестах
jest.mock('socket.io-client', () => {
    const createClient = () => ({
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
    });
    return { __esModule: true, default: createClient };
});
