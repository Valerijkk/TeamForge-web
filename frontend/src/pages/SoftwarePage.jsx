import React, { useState, useEffect } from 'react';
import './SoftwarePage.css';

// Компонент страницы для отображения и управления списком программного обеспечения
function SoftwarePage({ isAdmin }) {
    // Состояние: список ПО и данные формы для добавления/редактирования
    const [softwareList, setSoftwareList] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        description: '',
        image_url: '',
        github_url: ''
    });

    // Функция для загрузки списка ПО с сервера
    const fetchSoftware = () => {
        fetch('http://localhost:5000/software')
            .then(res => res.json())
            .then(data => setSoftwareList(data))
            .catch(err => console.error(err));
    };

    // Загружаем список ПО при монтировании компонента
    useEffect(() => {
        fetchSoftware();
    }, []);

    // Обработка отправки формы: создаём или обновляем запись в зависимости от наличия formData.id
    const handleSubmit = (e) => {
        e.preventDefault();
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id
            ? `http://localhost:5000/software/${formData.id}`
            : 'http://localhost:5000/software';
        // Передаем admin: true для проверки прав
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, admin: true })
        })
            .then(res => res.json())
            .then(() => {
                // Сброс формы и обновление списка
                setFormData({ id: null, title: '', description: '', image_url: '', github_url: '' });
                fetchSoftware();
            })
            .catch(err => console.error(err));
    };

    // Заполнение формы данными выбранного ПО для редактирования
    const handleEdit = (sw) => {
        setFormData(sw);
    };

    // Удаление ПО по ID
    const handleDelete = (id) => {
        fetch(`http://localhost:5000/software/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin: true })
        })
            .then(res => res.json())
            .then(() => fetchSoftware())
            .catch(err => console.error(err));
    };

    return (
        <div className="container software-page">
            <h2 className="software-title">Программное обеспечение</h2>

            {/* Карточки программного обеспечения */}
            <div className="software-cards-wrapper">
                {softwareList.map(sw => (
                    <div key={sw.id} className="software-card">
                        {sw.image_url && (
                            <img
                                src={sw.image_url}
                                alt={sw.title}
                                className="software-image"
                            />
                        )}
                        <h3 className="software-card-title">{sw.title}</h3>
                        <p className="software-card-desc">{sw.description}</p>
                        {sw.github_url && (
                            <a
                                href={sw.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="software-github-link"
                            >
                                GitHub
                            </a>
                        )}
                        {/* Кнопки редактирования и удаления для администратора */}
                        {isAdmin && (
                            <div className="software-admin-buttons">
                                <button onClick={() => handleEdit(sw)}>
                                    Редактировать
                                </button>
                                <button onClick={() => handleDelete(sw.id)}>
                                    Удалить
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Форма добавления/редактирования ПО (видна только администратору) */}
            {isAdmin && (
                <div className="software-form-wrapper">
                    <h3>{formData.id ? 'Редактировать ПО' : 'Добавить ПО'}</h3>
                    <form onSubmit={handleSubmit} className="software-form">
                        <input
                            type="text"
                            placeholder="Название"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                        /><br />

                        <textarea
                            placeholder="Описание"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                        /><br />

                        <input
                            type="text"
                            placeholder="URL изображения"
                            value={formData.image_url}
                            onChange={(e) =>
                                setFormData({ ...formData, image_url: e.target.value })
                            }
                        /><br />

                        <input
                            type="text"
                            placeholder="GitHub URL"
                            value={formData.github_url}
                            onChange={(e) =>
                                setFormData({ ...formData, github_url: e.target.value })
                            }
                        /><br />

                        <button type="submit">
                            {formData.id ? 'Обновить' : 'Добавить'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default SoftwarePage;
