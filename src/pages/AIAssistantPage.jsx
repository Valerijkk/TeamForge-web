// AIAssistantPage.jsx
import React from 'react';

function AIAssistantPage() {
    return (
        <div className="container">
            <h2>ИИ Помощник</h2>
            <iframe
                src="https://www.blackbox.ai/"
                title="ИИ Помощник"
                width="100%"
                height="500px"
                style={{ border: 'none' }}
            ></iframe>
        </div>
    );
}

export default AIAssistantPage;
