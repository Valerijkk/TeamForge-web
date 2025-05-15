import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarPage.css';

function CalendarPage({ user }) {
    // Состояния: выбранная дата, задачи на эту дату, данные формы и задачи на ближайшую неделю
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        description: '',
        // При первом создании используем локальную дату в формате YYYY-MM-DD
        due_date: new Date().toLocaleDateString('en-CA'),
    });
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    // Загрузка задач для выбранной даты
    const fetchTasksForDate = () => {
        if (!user) return;
        const dateStr = selectedDate.toLocaleDateString('en-CA');
        fetch(`http://localhost:5000/tasks?user_id=${user.id}&date=${dateStr}`)
            .then(res => res.json())
            .then(data => setTasks(data))
            .catch(err => console.error(err));
    };

    // Загрузка задач на ближайшую неделю (от сегодняшнего дня)
    const fetchUpcomingTasks = () => {
        if (!user) return;
        fetch(`http://localhost:5000/tasks?user_id=${user.id}`)
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

    // Автоматический вызов загрузки при смене даты или пользователя
    useEffect(() => {
        fetchTasksForDate();
        fetchUpcomingTasks();
        // eslint-disable-next-line
    }, [selectedDate, user]);

    // Добавление новой задачи или обновление существующей
    const handleAddOrUpdate = () => {
        if (!user) return;
        const localDate = selectedDate.toLocaleDateString('en-CA');
        const dueDateToSend = formData.due_date || localDate;

        if (formData.id) {
            // Обновляем существующую задачу
            fetch(`http://localhost:5000/tasks/${formData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    due_date: dueDateToSend,
                }),
            })
                .then(res => res.json())
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: localDate });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch(err => console.error(err));
        } else {
            // Создаём новую задачу
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
                .then(res => res.json())
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: localDate });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch(err => console.error(err));
        }
    };

    // Заполняем форму для редактирования выбранной задачи
    const handleEdit = (task) => {
        setFormData(task);
    };

    // Удаление задачи
    const handleDelete = (taskId) => {
        fetch(`http://localhost:5000/tasks/${taskId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => {
                fetchTasksForDate();
                fetchUpcomingTasks();
            })
            .catch(err => console.error(err));
    };

    // Если пользователь не авторизован — отображаем сообщение
    if (!user) {
        return <div>Пожалуйста, войдите, чтобы увидеть календарь!</div>;
    }

    // Рендер страницы с календарём, списками задач и формой
    return (
        <div className="calendar-page container">
            <h2 className="calendar-title">Календарь задач</h2>

            {/* Сам календарь */}
            <Calendar
                className="my-react-calendar"
                onChange={setSelectedDate}
                value={selectedDate}
                locale="ru-RU"
                calendarType="iso8601"
            />

            {/* Задачи на выбранную дату */}
            <h3 className="tasks-subtitle">
                Задачи на <span>{selectedDate.toLocaleDateString('en-CA')}</span>
            </h3>
            {tasks.length === 0 ? (
                <p className="tasks-none">Нет задач на выбранную дату.</p>
            ) : (
                <ul className="tasks-list">
                    {tasks.map(task => (
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

            {/* Форма добавления или редактирования задачи */}
            <h3 className="tasks-subtitle">
                {formData.id ? 'Редактировать задачу' : 'Добавить задачу'}
            </h3>
            <div className="task-form">
                <input
                    type="text"
                    placeholder="Название задачи"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
                <br />
                <textarea
                    placeholder="Описание задачи"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
                <br />
                <label className="date-label">Дата выполнения: </label>
                <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
                <br />
                <button className="btn-add-update" onClick={handleAddOrUpdate}>
                    {formData.id ? 'Обновить задачу' : 'Добавить задачу'}
                </button>
            </div>

            {/* Задачи на ближайшую неделю */}
            <h3 className="tasks-subtitle">Задачи на ближайшую неделю</h3>
            {upcomingTasks.length === 0 ? (
                <p className="tasks-none">Нет задач на ближайшую неделю.</p>
            ) : (
                <ul className="tasks-list">
                    {upcomingTasks.map(task => (
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
