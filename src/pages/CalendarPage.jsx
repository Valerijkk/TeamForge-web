import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarPage.css';

function CalendarPage({ user }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        description: '',
        // При первом создании делаем строку локальной даты,
        // чтобы тоже не было смещения
        due_date: new Date().toLocaleDateString('en-CA'),
    });
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    // Получаем задачи для выбранной даты (локальной)
    const fetchTasksForDate = () => {
        if (!user) return;
        // Формируем YYYY-MM-DD в локальном времени
        const dateStr = selectedDate.toLocaleDateString('en-CA');
        fetch(`http://localhost:5000/tasks?user_id=${user.id}&date=${dateStr}`)
            .then((res) => res.json())
            .then((data) => setTasks(data))
            .catch((err) => console.error(err));
    };

    // Получаем задачи на ближайшую неделю (без смещения)
    const fetchUpcomingTasks = () => {
        if (!user) return;
        fetch(`http://localhost:5000/tasks?user_id=${user.id}`)
            .then((res) => res.json())
            .then((data) => {
                const today = new Date();
                const upcoming = data.filter((task) => {
                    const taskDate = new Date(task.due_date);
                    const diffDays = (taskDate - today) / (1000 * 3600 * 24);
                    return diffDays >= 0 && diffDays <= 7;
                });
                setUpcomingTasks(upcoming);
            })
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        fetchTasksForDate();
        fetchUpcomingTasks();
        // eslint-disable-next-line
    }, [selectedDate, user]);

    const handleAddOrUpdate = () => {
        if (!user) return;

        // Получаем локальную дату, если пользователь не ввёл другую
        const localDate = selectedDate.toLocaleDateString('en-CA');
        const dueDateToSend = formData.due_date || localDate;

        if (formData.id) {
            // Редактирование
            fetch(`http://localhost:5000/tasks/${formData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    due_date: dueDateToSend,
                }),
            })
                .then((res) => res.json())
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: localDate });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch((err) => console.error(err));
        } else {
            // Создание
            fetch('http://localhost:5000/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    title: formData.title,
                    description: formData.description,
                    due_date: dueDateToSend,
                }),
            })
                .then((res) => res.json())
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: localDate });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch((err) => console.error(err));
        }
    };

    const handleEdit = (task) => {
        setFormData(task);
    };

    const handleDelete = (taskId) => {
        fetch(`http://localhost:5000/tasks/${taskId}`, { method: 'DELETE' })
            .then((res) => res.json())
            .then(() => {
                fetchTasksForDate();
                fetchUpcomingTasks();
            })
            .catch((err) => console.error(err));
    };

    // Если пользователь не залогинен, показываем заглушку
    if (!user) {
        return <div>Пожалуйста, войдите, чтобы увидеть календарь!</div>;
    }

    return (
        <div className="calendar-page container">
            <h2 className="calendar-title">Календарь задач</h2>

            <Calendar
                className="my-react-calendar"
                onChange={setSelectedDate}
                value={selectedDate}
                locale="ru-RU"
                // Если ваша версия react-calendar поддерживает, оставьте:
                //calendarType="ISO_8601"
                // Если нет, уберите calendarType совсем,
                // чтобы не вызывать "Unsupported calendar type"
            />

            <h3 className="tasks-subtitle">
                Задачи на <span>{selectedDate.toLocaleDateString('en-CA')}</span>
            </h3>
            {tasks.length === 0 ? (
                <p className="tasks-none">Нет задач на выбранную дату.</p>
            ) : (
                <ul className="tasks-list">
                    {tasks.map((task) => (
                        <li key={task.id} className="task-item">
                            <div className="task-item__info">
                                <strong className="task-item__title">{task.title}</strong>
                                <span className="task-item__desc"> – {task.description}</span>
                            </div>
                            <div className="task-item__buttons">
                                <button onClick={() => handleEdit(task)}>Редактировать</button>
                                <button onClick={() => handleDelete(task.id)}>Удалить</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <h3 className="tasks-subtitle">
                {formData.id ? 'Редактировать задачу' : 'Добавить задачу'}
            </h3>
            <div className="task-form">
                <input
                    type="text"
                    placeholder="Название задачи"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <br />

                <textarea
                    placeholder="Описание задачи"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <br />

                <label className="date-label">Дата выполнения: </label>
                <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
                <br />

                <button className="btn-add-update" onClick={handleAddOrUpdate}>
                    {formData.id ? 'Обновить задачу' : 'Добавить задачу'}
                </button>
            </div>

            <h3 className="tasks-subtitle">Задачи на ближайшую неделю</h3>
            {upcomingTasks.length === 0 ? (
                <p className="tasks-none">Нет задач на ближайшую неделю.</p>
            ) : (
                <ul className="tasks-list">
                    {upcomingTasks.map((task) => (
                        <li key={task.id} className="task-item">
                            <div className="task-item__info">
                                <strong className="task-item__title">{task.title}</strong>
                                <span className="task-item__desc"> (до {task.due_date})</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default CalendarPage;
