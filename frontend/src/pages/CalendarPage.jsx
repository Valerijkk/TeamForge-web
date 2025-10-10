// CalendarPage.jsx
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Container, Typography, TextField, Button, List, ListItem, ListItemText, Divider } from '@mui/material';

function CalendarPage({ user }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [formData, setFormData] = useState({ id: null, title: '', description: '', due_date: new Date().toISOString().slice(0,10) });
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    const fetchTasksForDate = () => {
        if (!user) return;
        const dateStr = selectedDate.toISOString().slice(0,10);
        fetch(`http://localhost:5000/tasks?user_id=${user.id}&date=${dateStr}`)
            .then(res => res.json())
            .then(data => setTasks(data))
            .catch(err => console.error(err));
    };

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

    useEffect(() => {
        fetchTasksForDate();
        fetchUpcomingTasks();
    }, [selectedDate, user]);

    const handleAddOrUpdate = () => {
        if (!user) return;
        const dueDateToSend = formData.due_date || selectedDate.toISOString().slice(0,10);
        if (formData.id) {
            fetch(`http://localhost:5000/tasks/${formData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: formData.title, description: formData.description, due_date: dueDateToSend }),
            })
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: dueDateToSend });
                    fetchTasksForDate();
                    fetchUpcomingTasks();
                })
                .catch(err => console.error(err));
        } else {
            fetch('http://localhost:5000/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, title: formData.title, description: formData.description, due_date: dueDateToSend }),
            })
                .then(() => {
                    setFormData({ id: null, title: '', description: '', due_date: dueDateToSend });
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
            .then(() => {
                fetchTasksForDate();
                fetchUpcomingTasks();
            })
            .catch(err => console.error(err));
    };

    if (!user) {
        return (
            <Container sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>Календарь задач</Typography>
                <Calendar onChange={setSelectedDate} value={selectedDate} locale="ru-RU" calendarType="iso8601" />
                <Typography sx={{ mt: 2 }}>Пожалуйста, войдите, чтобы увидеть календарь!</Typography>
            </Container>
        );
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>Календарь задач</Typography>
            <Calendar onChange={setSelectedDate} value={selectedDate} locale="ru-RU" calendarType="iso8601" />

            <Typography variant="h6" sx={{ mt: 2 }}>Задачи на {selectedDate.toISOString().slice(0,10)}</Typography>
            {tasks.length === 0 ? (
                <Typography>Нет задач на выбранную дату.</Typography>
            ) : (
                <List>
                    {tasks.map(task => (
                        <ListItem key={task.id}>
                            <ListItemText primary={task.title} secondary={task.description} />
                            <Button onClick={() => handleEdit(task)}>Редактировать</Button>
                            <Button onClick={() => handleDelete(task.id)}>Удалить</Button>
                        </ListItem>
                    ))}
                </List>
            )}

            <Typography variant="h6" sx={{ mt: 2 }}>{formData.id ? 'Редактировать задачу' : 'Добавить задачу'}</Typography>
            <TextField
                label="Название задачи"
                fullWidth
                margin="normal"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <TextField
                label="Описание задачи"
                fullWidth
                margin="normal"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
                label="Дата выполнения"
                type="date"
                fullWidth
                margin="normal"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleAddOrUpdate}>
                {formData.id ? 'Обновить задачу' : 'Добавить задачу'}
            </Button>

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6">Задачи на ближайшую неделю</Typography>
            {upcomingTasks.length === 0 ? (
                <Typography>Нет задач на ближайшую неделю.</Typography>
            ) : (
                <List>
                    {upcomingTasks.map(task => (
                        <ListItem key={task.id}>
                            <ListItemText primary={task.title} secondary={`до ${task.due_date}`} />
                        </ListItem>
                    ))}
                </List>
            )}
        </Container>
    );
}

export default CalendarPage;
