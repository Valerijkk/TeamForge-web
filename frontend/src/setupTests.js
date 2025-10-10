/* eslint-disable */
import '@testing-library/jest-dom';

/** ---------- Глобальное "состояние" для useSelector в тестах ---------- */
globalThis.TEST_STATE = {
    theme: 'light',
    user: { id: 'test-user', username: 'Test User' },
};

/** ---------- react-redux: провайдер не нужен, хуки стабовые ---------- */
jest.mock(
    'react-redux',
    () => {
        const mockDispatch = jest.fn();
        return {
            __esModule: true,
            Provider: ({ children }) => (children ?? null),
            useDispatch: () => mockDispatch,
            useSelector: (selector) => selector(globalThis.TEST_STATE),
        };
    },
    { virtual: true }
);

/** ---------- react-router-dom v7: виртуальный мок ---------- */
jest.mock(
    'react-router-dom',
    () => {
        const mockNavigate = jest.fn();
        return {
            __esModule: true,
            MemoryRouter: ({ children }) => (children ?? null),
            BrowserRouter: ({ children }) => (children ?? null),
            Routes: ({ children }) => (children ?? null),
            Route: ({ element, children }) => (element ?? children ?? null),
            Link: ({ children }) => (children ?? null),
            NavLink: ({ children }) => (children ?? null),
            Outlet: ({ children }) => (children ?? null),
            useNavigate: () => mockNavigate,
            useParams: () => ({}),
            useLocation: () => ({ pathname: '/' }),
        };
    },
    { virtual: true }
);

/** ---------- socket.io-client: заглушка ---------- */
jest.mock('socket.io-client', () => {
    const createClient = () => ({
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
    });
    return { __esModule: true, default: createClient };
});

/** ---------- fetch по умолчанию: успешная пустая выдача ---------- */
if (typeof global.fetch === 'undefined') {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: async () => [] })
    );
}

/** ---------- WebRTC/медиа-стабы на всякий ---------- */
if (!global.navigator) global.navigator = {};
if (!global.navigator.mediaDevices) {
    global.navigator.mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [],
        }),
    };
}
class FakeRTCPeerConnection {
    createOffer = jest.fn().mockResolvedValue({});
    setLocalDescription = jest.fn().mockResolvedValue();
    addTrack = jest.fn();
    close = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
}
if (!global.RTCPeerConnection) {
    global.RTCPeerConnection = FakeRTCPeerConnection;
}
