// SoftwarePage.jsx
import React, { useState, useEffect } from 'react';

function SoftwarePage({ isAdmin }) {
    const [softwareList, setSoftwareList] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        description: '',
        image_url: '',
        github_url: ''
    });

    const fetchSoftware = () => {
        fetch('http://localhost:5000/software')
            .then(res => res.json())
            .then(data => setSoftwareList(data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchSoftware();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `http://localhost:5000/software/${formData.id}` : 'http://localhost:5000/software';
        // Передаем admin: true для проверки прав
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, admin: true })
        })
            .then(res => res.json())
            .then(() => {
                setFormData({ id: null, title: '', description: '', image_url: '', github_url: '' });
                fetchSoftware();
            })
            .catch(err => console.error(err));
    };

    const handleEdit = (sw) => {
        setFormData(sw);
    };

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
        <div className="container">
            <h2>Программное обеспечение</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {softwareList.map(sw => (
                    <div key={sw.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', width: '300px' }}>
                        {sw.image_url && <img src={sw.image_url} alt={sw.title} style={{ width: '100%', borderRadius: '4px' }} />}
                        <h3>{sw.title}</h3>
                        <p>{sw.description}</p>
                        {sw.github_url && (
                            <a href={sw.github_url} target="_blank" rel="noreferrer">
                                GitHub
                            </a>
                        )}
                        {isAdmin && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <button onClick={() => handleEdit(sw)}>Редактировать</button>
                                <button onClick={() => handleDelete(sw.id)}>Удалить</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {isAdmin && (
                <div style={{ marginTop: '2rem' }}>
                    <h3>{formData.id ? 'Редактировать ПО' : 'Добавить ПО'}</h3>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Название"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        /><br/>
                        <textarea
                            placeholder="Описание"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        /><br/>
                        <input
                            type="text"
                            placeholder="URL изображения"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        /><br/>
                        <input
                            type="text"
                            placeholder="GitHub URL"
                            value={formData.github_url}
                            onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                        /><br/>
                        <button type="submit">{formData.id ? 'Обновить' : 'Добавить'}</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default SoftwarePage;
