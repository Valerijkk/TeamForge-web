import React from 'react';
import './AIAssistantPage.css';

function AIAssistantPage() {
    return (
        <div className="container ai-assistant-container">
            {/* Заголовок раздела ИИ-помощника */}
            <h2 className="ai-assistant-title">ИИ Помощник</h2>
            {/* Обёртка для iframe с внешним интерфейсом ИИ */}
            <div className="ai-assistant-iframe-wrapper">
                <iframe
                    src="https://www.blackbox.ai/"
                    title="ИИ Помощник"
                    width="100%"
                    height="1000px"
                    style={{ border: 'none' }}
                />
            </div>
        </div>
    );
}

export default AIAssistantPage;
