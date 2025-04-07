// CalendarPage.jsx
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarPage.css'; // Подключаем свой файл стилей (пример)

function CalendarPage() {
    // Выбранная дата (по умолчанию сегодня)
    const [selectedDate, setSelectedDate] = useState(new Date());
    // Задачи для выбранной даты
    const [tasks, setTasks] = useState([]);
    // Форма для добавления/редактирования задачи
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        description: '',
        due_date: new Date().toISOString().slice(0,10) // формат YYYY-MM-DD
    });
    // Задачи на ближайшую неделю
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    // Получаем задачи для выбранной даты (GET /tasks?date=YYYY-MM-DD)
    const fetchTasksForDate = () => {
        const dateStr = selectedDate.toISOString().slice(0,10);
        fetch(`http://localhost:5000/tasks?date=${dateStr}`)
            .then(res => res.json())
            .then(data => setTasks(data))
            .catch(err => console.error(err));
    };

    // Получаем все задачи и фильтруем те, что на ближайшую неделю
    const fetchUpcomingTasks = () => {
        fetch('http://localhost:5000/tasks')
            .then(res => res.json())
            .then(data => {
                const today = new Date();
                const upcoming = data.filter(task => {
                    const taskDate = new Date(task.due_date);
                    const diffDays = (taskDate - today) / (1000 * 3600 * 24);
                    return diffDays >= 0 && diffDays <= 7;
                });
                setUpcomingTasks(upcoming);
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchTasksForDate();
        fetchUpcomingTasks();
        // eslint-disable-next-line
    }, [selectedDate]);

    // Добавление новой задачи или обновление существующей
    const handleAddOrUpdate = () => {
        const dateStr = selectedDate.toISOString().slice(0,10);

        // Если в formData есть id, значит редактируем
        if (formData.id) {
            // Редактирование (PUT /tasks/<id>)
            fetch(`http://localhost:5000/tasks/${formData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    due_date: formData.due_date || dateStr
                })
            })
                .then(res => res.json())
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: dateStr });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch(err => console.error(err));
        } else {
            // Создание новой задачи (POST /tasks)
            fetch('http://localhost:5000/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    due_date: formData.due_date || dateStr
                })
            })
                .then(res => res.json())
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: dateStr });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch(err => console.error(err));
        }
    };

    const handleEdit = (task) => {
        setFormData(task);
    };

    const handleDelete = (taskId) => {
        fetch(`http://localhost:5000/tasks/${taskId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => {
                fetchTasksForDate();
                fetchUpcomingTasks();
            })
            .catch(err => console.error(err));
    };

    return (
        <div className="container">
            <h2>Календарь задач</h2>
            <Calendar
                className="my-react-calendar"
                onChange={setSelectedDate}
                value={selectedDate}
            />
            <h3>Задачи на {selectedDate.toISOString().slice(0,10)}</h3>
            {tasks.length === 0 ? (
                <p>Нет задач на выбранную дату.</p>
            ) : (
                <ul>
                    {tasks.map(task => (
                        <li key={task.id}>
                            <strong>{task.title}</strong> – {task.description}
                            <button onClick={() => handleEdit(task)}>Редактировать</button>
                            <button onClick={() => handleDelete(task.id)}>Удалить</button>
                        </li>
                    ))}
                </ul>
            )}
            <h3>{formData.id ? 'Редактировать задачу' : 'Добавить задачу'}</h3>
            <div>
                <input
                    type="text"
                    placeholder="Название задачи"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                /><br/>
                <textarea
                    placeholder="Описание задачи"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                /><br/>
                <label>Дата выполнения: </label>
                <input
                    type="date"
                    value={formData.due_date || selectedDate.toISOString().slice(0,10)}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                /><br/>
                <button onClick={handleAddOrUpdate}>
                    {formData.id ? 'Обновить задачу' : 'Добавить задачу'}
                </button>
            </div>
            <h3>Задачи на ближайшую неделю</h3>
            {upcomingTasks.length === 0 ? (
                <p>Нет задач на ближайшую неделю.</p>
            ) : (
                <ul>
                    {upcomingTasks.map(task => (
                        <li key={task.id}>
                            <strong>{task.title}</strong> (до {task.due_date})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default CalendarPage;
