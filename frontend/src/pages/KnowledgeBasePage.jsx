// KnowledgeBasePage.jsx
import React, { useState } from 'react';
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const knowledgeArticles = [
    { id: 1, title: 'Основы HTML', description: 'Что такое HTML...', link: 'https://rivilart.github.io/html-basics.html' },
    { id: 2, title: 'CSS для начинающих', description: 'Основные принципы CSS...', link: 'https://kotazzz.github.io/p/css01/' },
    { id: 3, title: 'JavaScript: основы', description: 'Введение в JavaScript...', link: 'https://kotazzz.github.io/p/js01/' },
    { id: 4, title: 'Python: основы', description: 'Введение в Python...', link: 'https://docs.python.org/3/tutorial/' },
    { id: 5, title: 'Django: создание веб-приложений', description: 'Ознакомление с Django...', link: 'https://confar.github.io/blog/2017/11/13/django-auth-app/' },
    { id: 6, title: 'Flask: легковесный фреймворк', description: 'Основы работы с Flask...', link: 'https://flask.palletsprojects.com/en/2.2.x/' },
    { id: 7, title: 'Data Science: анализ данных', description: 'Методы анализа данных...', link: 'https://vinesmsuic.github.io/datascience/' },
    { id: 8, title: 'Machine Learning: введение', description: 'Алгоритмы машинного обучения...', link: 'https://deepmachinelearning.ru/docs/Machine-learning/intro' },
    { id: 9, title: 'DevOps: CI/CD и автоматизация', description: 'Принципы DevOps...', link: 'https://pro-dgtl.ru/blog/razrabotka/tpost/loxxxzp5c1-cicd-chto-eto-takoe-soveti-i-primeri' },
    { id: 10, title: 'Основы Git и GitHub', description: 'Использование Git и GitHub...', link: 'https://drstearns.github.io/tutorials/git/' }
];

function KnowledgeBasePage() {
    const [expanded, setExpanded] = useState(false);

    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>База знаний</Typography>
            {knowledgeArticles.map(article => (
                <Accordion key={article.id} expanded={expanded === article.id} onChange={handleChange(article.id)}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{article.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography>{article.description}</Typography>
                        <Button size="small" variant="contained" color="primary" href={article.link} target="_blank" sx={{ mt: 1 }}>
                            Подробнее
                        </Button>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Container>
    );
}

export default KnowledgeBasePage;
