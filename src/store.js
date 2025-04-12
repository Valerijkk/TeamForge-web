// store.js
import { createStore } from 'redux';

// Изначальное состояние: берём тему из localStorage или 'light'
const initialState = {
    theme: localStorage.getItem('appTheme') || 'light',
};

// Простой reducer, реагирующий на экшен "SET_THEME"
function rootReducer(state = initialState, action) {
    switch (action.type) {
        case 'SET_THEME':
            return { ...state, theme: action.payload };
        default:
            return state;
    }
}

// Создаём store
const store = createStore(rootReducer);

export default store;
