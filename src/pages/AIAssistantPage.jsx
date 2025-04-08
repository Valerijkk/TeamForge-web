import React from 'react';
import './AIAssistantPage.css'; // Подключаем файл стилей для страницы ИИ Помощника

function AIAssistantPage() {
    return (
        <div className="container ai-assistant-container">
            <h2 className="ai-assistant-title">ИИ Помощник</h2>
            <div className="ai-assistant-iframe-wrapper">
                <iframe
                    src="https://www.blackbox.ai/"
                    title="ИИ Помощник"
                    width="100%"
                    height="1000px"
                    style={{ border: 'none' }}
                ></iframe>
            </div>
        </div>
    );
}

export default AIAssistantPage;
