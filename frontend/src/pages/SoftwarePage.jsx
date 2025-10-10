import React, { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Button,
    TextField,
    Box,
    Link,
} from "@mui/material";
import { Edit, Delete as DeleteIcon, GitHub } from "@mui/icons-material";

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function SoftwarePage({ isAdmin }) {
    const [softwareList, setSoftwareList] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        title: "",
        description: "",
        image_url: "",
        github_url: "",
    });

    const fetchSoftware = () => {
        fetch(`${BASE_URL}/software`)
            .then((res) => res.json())
            .then((data) => setSoftwareList(Array.isArray(data) ? data : []))
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        fetchSoftware();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const method = formData.id ? "PUT" : "POST";
        const url = formData.id
            ? `${BASE_URL}/software/${formData.id}`
            : `${BASE_URL}/software`;

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            // сохранён флаг admin: true, как у тебя
            body: JSON.stringify({ ...formData, admin: true }),
        })
            .then((res) => res.json())
            .then(() => {
                setFormData({
                    id: null,
                    title: "",
                    description: "",
                    image_url: "",
                    github_url: "",
                });
                fetchSoftware();
            })
            .catch((err) => console.error(err));
    };

    const handleEdit = (sw) => setFormData(sw);

    const handleDelete = (id) => {
        fetch(`${BASE_URL}/software/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin: true }),
        })
            .then((res) => res.json())
            .then(() => fetchSoftware())
            .catch((err) => console.error(err));
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Программное обеспечение
            </Typography>

            <Grid container spacing={2}>
                {softwareList.map((sw) => (
                    <Grid item xs={12} sm={6} md={4} key={sw.id}>
                        <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            {sw.image_url && (
                                <CardMedia
                                    component="img"
                                    image={sw.image_url}
                                    alt={sw.title}
                                    sx={{ aspectRatio: "16/9", objectFit: "cover" }}
                                />
                            )}
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6">{sw.title}</Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    {sw.description}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                                <Box>
                                    {sw.github_url && (
                                        <Button
                                            size="small"
                                            startIcon={<GitHub />}
                                            component={Link}
                                            href={sw.github_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            GitHub
                                        </Button>
                                    )}
                                </Box>
                                {isAdmin && (
                                    <Box>
                                        <Button
                                            size="small"
                                            startIcon={<Edit />}
                                            onClick={() => handleEdit(sw)}
                                        >
                                            Редактировать
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleDelete(sw.id)}
                                        >
                                            Удалить
                                        </Button>
                                    </Box>
                                )}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {isAdmin && (
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        {formData.id ? "Редактировать ПО" : "Добавить ПО"}
                    </Typography>

                    <TextField
                        label="Название"
                        fullWidth
                        margin="normal"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />

                    <TextField
                        label="Описание"
                        fullWidth
                        margin="normal"
                        multiline
                        minRows={3}
                        value={formData.description}
                        onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                        }
                    />

                    <TextField
                        label="URL изображения"
                        fullWidth
                        margin="normal"
                        value={formData.image_url}
                        onChange={(e) =>
                            setFormData({ ...formData, image_url: e.target.value })
                        }
                    />

                    <TextField
                        label="GitHub URL"
                        fullWidth
                        margin="normal"
                        value={formData.github_url}
                        onChange={(e) =>
                            setFormData({ ...formData, github_url: e.target.value })
                        }
                    />

                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                        <Button type="submit" variant="contained">
                            {formData.id ? "Обновить" : "Добавить"}
                        </Button>
                        {formData.id && (
                            <Button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        id: null,
                                        title: "",
                                        description: "",
                                        image_url: "",
                                        github_url: "",
                                    })
                                }
                            >
                                Отмена
                            </Button>
                        )}
                    </Box>
                </Box>
            )}
        </Container>
    );
}

export default SoftwarePage;
