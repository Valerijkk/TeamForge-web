/* eslint-disable */
import '@testing-library/jest-dom';

// Мокаем react-router-dom (ESM v7) без обращения к внешним переменным
jest.mock('react-router-dom', () => ({
    __esModule: true,
    // Примитивные "обёртки" — просто пропускают детей
    MemoryRouter: ({ children }) => (children ?? null),
    BrowserRouter: ({ children }) => (children ?? null),
    Routes: ({ children }) => (children ?? null),
    Route: ({ element, children }) => (element ?? children ?? null),
    Link: ({ children }) => (children ?? null),
    NavLink: ({ children }) => (children ?? null),
    Outlet: ({ children }) => (children ?? null),

    // Хуки — простые заглушки
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
}));

// Мокаем socket.io-client, чтобы тесты не пытались открыть сокеты
jest.mock('socket.io-client', () => {
    const createClient = () => ({
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
    });
    return { __esModule: true, default: createClient };
});
