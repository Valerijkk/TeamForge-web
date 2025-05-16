import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from '../store';
import ProfilePage from '../pages/ProfilePage';

test('ProfilePage рендерится и показывает профиль', () => {
    render(
        <Provider store={store}>
            <ProfilePage />
        </Provider>
    );
    expect(screen.getByText(/профиль/i)).toBeInTheDocument();
});
