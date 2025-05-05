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
        title: 'Python: основы',
        description: 'Введение в язык Python, его синтаксис и базовые концепции программирования.',
        link: 'https://docs.python.org/3/tutorial/index.html'
    },
    {
        id: 5,
        title: 'Django: создание веб-приложений',
        description: 'Ознакомление с фреймворком Django для разработки полнофункциональных веб-приложений.',
        link: 'https://confar.github.io/blog/2017/11/13/django-auth-app/'
    },
    {
        id: 6,
        title: 'Flask: легковесный фреймворк',
        description: 'Основы работы с Flask для создания небольших, быстрых веб-приложений.',
        link: 'https://flask.palletsprojects.com/en/2.2.x/'
    },
    {
        id: 7,
        title: 'Data Science: анализ данных',
        description: 'Ключевые методы анализа данных, визуализации и интерпретации результатов.',
        link: 'https://vinesmsuic.github.io/datascience/'
    },
    {
        id: 8,
        title: 'Machine Learning: введение',
        description: 'Основные алгоритмы машинного обучения и примеры их применения.',
        link: 'https://deepmachinelearning.ru/docs/Machine-learning/intro'
    },
    {
        id: 9,
        title: 'DevOps: CI/CD и автоматизация',
        description: 'Принципы DevOps, методологии CI/CD и автоматизации процессов разработки.',
        link: 'https://pro-dgtl.ru/blog/razrabotka/tpost/loxxxzp5c1-cicd-chto-eto-takoe-soveti-i-primeri'
    },
    {
        id: 10,
        title: 'Основы Git и GitHub',
        description: 'Как использовать систему контроля версий Git и платформу GitHub для совместной работы над проектами.',
        link: 'https://drstearns.github.io/tutorials/git/'
    }
];

function KnowledgeBasePage() {
    const [expandedArticleId, setExpandedArticleId] = useState(null);

    const toggleArticle = (id) => {
        setExpandedArticleId(prev => (prev === id ? null : id));
    };

    return (
        <div className="container knowledge-container">
            <h2 className="knowledge-title">База знаний</h2>
            <ul className="knowledge-list">
                {knowledgeArticles.map(article => (
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
