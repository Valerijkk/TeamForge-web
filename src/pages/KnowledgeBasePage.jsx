import React, { useState } from 'react';
import './KnowledgeBasePage.css'; // Подключаем отдельный файл стилей

const knowledgeArticles = [
    {
        id: 1,
        title: 'Основы HTML',
        description: 'Что такое HTML и как его использовать для создания веб-страниц.',
        link: 'https://rivilart.github.io/html-basics.html'
    },
    {
        id: 2,
        title: 'CSS для начинающих',
        description: 'Основные принципы CSS, стилизация элементов и построение макетов.',
        link: 'https://kotazzz.github.io/p/css01/'
    },
    {
        id: 3,
        title: 'Java Script: основы',
        description: 'Введение в JavaScript и его применение в веб-разработке.',
        link: 'https://kotazzz.github.io/p/js01/'
    },
    {
        id: 4,
        title: 'Основы Responsive Design',
        description: 'Как создавать адаптивные веб-страницы, которые хорошо отображаются на разных устройствах.',
        link: 'https://www.smashingmagazine.com/2011/01/guidelines-for-responsive-web-design/'
    },
    {
        id: 5,
        title: 'Flexbox: Управление раскладкой',
        description: 'Как использовать CSS Flexbox для создания гибких и адаптивных макетов.',
        link: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/'
    },
    {
        id: 6,
        title: 'Grid Layout: Современные возможности CSS',
        description: 'Подробное руководство по использованию CSS Grid Layout для построения сеток.',
        link: 'https://css-tricks.com/snippets/css/complete-guide-grid/'
    },
    {
        id: 7,
        title: 'Работа с API в JavaScript',
        description: 'Как получить данные с помощью fetch API и работать с RESTful сервисами.',
        link: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch'
    },
    {
        id: 8,
        title: 'Modern JavaScript (ES6+)',
        description: 'Новые возможности языка JavaScript: стрелочные функции, промисы, async/await, и многое другое.',
        link: 'https://www.freecodecamp.org/news/learn-es6-with-examples/'
    },
    {
        id: 9,
        title: 'Accessibility в веб-разработке',
        description: 'Основы доступности для создания инклюзивных веб-сайтов.',
        link: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/'
    },
    {
        id: 10,
        title: 'Основы Git и GitHub',
        description: 'Как использовать систему контроля версий Git и платформу GitHub для совместной работы над проектами.',
        link: 'https://guides.github.com/introduction/git-handbook/'
    }
];

function KnowledgeBasePage() {
    const [expandedArticleId, setExpandedArticleId] = useState(null);

    const toggleArticle = (id) => {
        setExpandedArticleId((prev) => (prev === id ? null : id));
    };

    return (
        <div className="container knowledge-container">
            <h2 className="knowledge-title">База знаний</h2>
            <ul className="knowledge-list">
                {knowledgeArticles.map((article) => (
                    <li key={article.id} className="knowledge-item">
                        <h3>{article.title}</h3>
                        <p>{article.description}</p>
                        <button onClick={() => toggleArticle(article.id)}>
                            {expandedArticleId === article.id ? 'Свернуть' : 'Подробнее'}
                        </button>
                        {expandedArticleId === article.id && (
                            <div className="knowledge-iframe-wrapper">
                                <iframe
                                    src={article.link}
                                    title={article.title}
                                    width="100%"
                                    height="500px"
                                    style={{ border: 'none' }}
                                ></iframe>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default KnowledgeBasePage;
