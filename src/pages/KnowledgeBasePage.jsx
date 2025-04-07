// KnowledgeBasePage.jsx
import React, { useState } from 'react';

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
    }
];

function KnowledgeBasePage() {
    const [expandedArticleId, setExpandedArticleId] = useState(null);

    const toggleArticle = (id) => {
        setExpandedArticleId(prev => (prev === id ? null : id));
    };

    return (
        <div className="container">
            <h2>База знаний веб-разработки</h2>
            <ul>
                {knowledgeArticles.map(article => (
                    <li key={article.id} style={{ marginBottom: '1rem' }}>
                        <h3>{article.title}</h3>
                        <p>{article.description}</p>
                        <button onClick={() => toggleArticle(article.id)}>
                            {expandedArticleId === article.id ? 'Свернуть' : 'Подробнее'}
                        </button>
                        {expandedArticleId === article.id && (
                            <div style={{ marginTop: '1rem' }}>
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
