// Импортируем библиотеку React для использования JSX и создания компонентов
import React from 'react';

// Импортируем CSS файл для стилизации компонента страницы ИИ Помощника
import './AIAssistantPage.css';

// Объявляем функциональный компонент AIAssistantPage
function AIAssistantPage() {
    // Возвращаем JSX-разметку, которая определяет структуру компонента
    return (
        // Основной контейнер с классами для оформления контейнера и специфической страницы ИИ Помощника
        <div className="container ai-assistant-container">
            {/* Заголовок страницы ИИ Помощника с применением специфического класса для стилизации */}
            <h2 className="ai-assistant-title">ИИ Помощник</h2>
            {/* Обертка для iframe, обеспечивающая стилизацию и корректное размещение в контейнере */}
            <div className="ai-assistant-iframe-wrapper">
                {/* Встраиваемый фрейм, который отображает внешний ресурс (в данном случае сайт blackbox.ai) */}
                <iframe
                    src="https://www.blackbox.ai/" // URL источника, который загружается в iframe
                    title="ИИ Помощник"           // Атрибут title для iframe, улучшает доступность
                    width="100%"                  // Задает ширину iframe в 100% от родительского элемента
                    height="1000px"               // Устанавливает фиксированную высоту iframe в 1000 пикселей
                    style={{ border: 'none' }}
                ></iframe>
            </div>
        </div>
    );
}


export default AIAssistantPage;
