import React from 'react';
import './MainPage.css';

function MainPage() {
    return (
        <div className="main-page">
            <div className="overlay">
                {/* Название приложения */}
                <h1>TeamForge</h1>
                {/* Описание возможностей чата */}
                <p>
                    Чат для программистов — общайтесь, делитесь файлами, создавайте команды и воплощайте идеи!
                </p>
                {/* Кнопка перехода на страницу регистрации */}
                <a href="/register" className="cta-button">
                    Начать сейчас
                </a>
            </div>
        </div>
    );
}

export default MainPage;
