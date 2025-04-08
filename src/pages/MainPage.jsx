import React from 'react';
import './MainPage.css';

function MainPage() {
    return (
        <div className="main-page">
            <div className="overlay">
                <h1>TeamForge</h1>
                <p>
                    Чат для программистов — общайтесь, делитесь файлами, создавайте команды и воплощайте идеи!
                </p>
                <a href="/register" className="cta-button">
                    Начать сейчас
                </a>
            </div>
        </div>
    );
}

export default MainPage;
