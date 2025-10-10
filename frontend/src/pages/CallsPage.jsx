// CallsPage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
    Container, Typography, Box, Button, Grid, Card, CardContent, FormControlLabel, RadioGroup, Radio, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox
} from '@mui/material';
import { Mic, MicOff, Videocam, ScreenShare, CallEnd } from '@mui/icons-material';

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const socket = io(BASE_URL, { transports: ["websocket"], withCredentials: true });

export default function CallsPage({ user }) {
    const navigate = useNavigate();

    const [callType, setCallType] = useState("personal");
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);

    const [callActive, setCallActive] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [participants, setParticipants] = useState([]);

    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(false);
    const [screenOn, setScreenOn] = useState(false);

    const localStreamRef = useRef(null);
    const camTrackRef = useRef(null);
    const screenTrackRef = useRef(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const peerConnsRef = useRef({});
    const mounted = useRef(true);

    useEffect(() => () => { mounted.current = false; }, []);

    const renegotiate = useCallback(async (pc, peerId) => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc_offer", { to: peerId, from: user.id, sdp: pc.localDescription });
        } catch (e) {
            console.error("Renegotiate error", e);
        }
    }, [user]);

    const createPC = useCallback((peerId) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }
        pc.onicecandidate = e => {
            if (e.candidate) {
                socket.emit("webrtc_candidate", { to: peerId, from: user.id, candidate: e.candidate });
            }
        };
        pc.ontrack = e => {
            if (!mounted.current) return;
            setRemoteStreams(prev => {
                const entry = prev[peerId] ?? { audio: null, video: [] };
                if (e.track.kind === "audio") entry.audio = e.track;
                else {
                    if (!entry.video.some(v => v.id === e.track.id)) entry.video.push(e.track);
                }
                return { ...prev, [peerId]: entry };
            });
        };
        peerConnsRef.current[peerId] = pc;
        return pc;
    }, [user]);

    const cleanUp = useCallback(() => {
        Object.values(peerConnsRef.current).forEach(pc => {
            pc.getSenders().forEach(s => s.track && s.track.stop());
            pc.close();
        });
        peerConnsRef.current = {};
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        camTrackRef.current = null;
        screenTrackRef.current = null;
        setRemoteStreams({});
        setCallActive(false);
        setMicOn(true);
        setCamOn(false);
        setScreenOn(false);
        setParticipants([]);
    }, []);

    const leaveCall = () => {
        cleanUp();
    };

    useEffect(() => {
        if (!user) { navigate('/'); return; }

        fetch(`${BASE_URL}/friends/${user.id}`)
            .then(res => res.json())
            .then(data => { if (mounted.current) setAllUsers(Array.isArray(data) ? data : []); })
            .catch(console.error);

        socket.emit("register_user", { user_id: user.id });

        const onIncoming = d => mounted.current && !callActive && setIncomingCall(d);
        const onOffer = async d => {
            try {
                const pc = createPC(d.from);
                await pc.setRemoteDescription(new RTCSessionDescription(d.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("webrtc_answer", { to: d.from, from: user.id, sdp: pc.localDescription });
            } catch (e) {
                console.error("Error handling offer", e);
            }
        };
        const onAnswer = async d => {
            const pc = peerConnsRef.current[d.from];
            try {
                pc && (await pc.setRemoteDescription(new RTCSessionDescription(d.sdp)));
            } catch (e) {
                console.error("Error handling answer", e);
            }
        };
        const onCandidate = async d => {
            const pc = peerConnsRef.current[d.from];
            try {
                pc && d.candidate && (await pc.addIceCandidate(new RTCIceCandidate(d.candidate)));
            } catch (e) {
                console.error("Error adding candidate", e);
            }
        };
        const onEndCall = () => cleanUp();

        socket.on("incoming_call", onIncoming);
        socket.on("webrtc_offer", onOffer);
        socket.on("webrtc_answer", onAnswer);
        socket.on("webrtc_candidate", onCandidate);
        socket.on("end_call", onEndCall);

        return () => {
            socket.off("incoming_call", onIncoming);
            socket.off("webrtc_offer", onOffer);
            socket.off("webrtc_answer", onAnswer);
            socket.off("webrtc_candidate", onCandidate);
            socket.off("end_call", onEndCall);
        };
    }, [user, navigate, callActive, createPC, cleanUp]);

    const ensureBaseAudio = async () => {
        if (!localStreamRef.current) {
            try {
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (e) {
                alert("Нет доступа к микрофону.");
                throw e;
            }
        }
    };

    const joinPeers = async (targets, answerMode) => {
        await ensureBaseAudio();
        setCallActive(true);
        setParticipants(targets);
        if (!answerMode) {
            socket.emit("initiate_call", { from: user.id, callType, targets });
        }
        for (const pid of targets) {
            const pc = createPC(pid);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc_offer", { to: pid, from: user.id, sdp: pc.localDescription });
        }
    };

    const acceptCall = () => {
        if (incomingCall) {
            joinPeers([incomingCall.from], true).catch(() => {});
            setIncomingCall(null);
        }
    };

    const startCall = () => {
        const targets = callType === "personal" ? [selectedUser] : selectedUsers;
        if (targets.length) {
            joinPeers(targets, false).catch(() => {});
        }
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>Звонки</Typography>
            {incomingCall && !callActive && (
                <Box sx={{ p: 2, border: '1px dashed #ff8c00', mb: 2, borderRadius: 1, bgcolor: '#fffbe6' }}>
                    <Typography>Входящий звонок от ID {incomingCall.from}</Typography>
                    <Button onClick={acceptCall} color="primary" sx={{ mt: 1 }}>Принять</Button>
                    <Button onClick={() => setIncomingCall(null)} sx={{ mt: 1, ml: 1 }}>Отклонить</Button>
                </Box>
            )}
            {!callActive && !incomingCall && (
                <Box>
                    <Typography variant="subtitle1" gutterBottom>Тип звонка:</Typography>
                    <RadioGroup row value={callType} onChange={(e) => setCallType(e.target.value)}>
                        <FormControlLabel value="personal" control={<Radio />} label="Личный" />
                        <FormControlLabel value="group" control={<Radio />} label="Групповой" />
                    </RadioGroup>

                    {callType === 'personal' && (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Выберите друга</InputLabel>
                            <Select value={selectedUser} label="Выберите друга" onChange={e => setSelectedUser(e.target.value)}>
                                {allUsers.map(u => (
                                    <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {callType === 'group' && (
                        <Box sx={{ mt: 2 }}>
                            <Typography>Участники:</Typography>
                            {allUsers.map(u => (
                                <FormControlLabel
                                    key={u.id}
                                    control={
                                        <Checkbox
                                            checked={selectedUsers.includes(u.id)}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                                                else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                            }}
                                        />
                                    }
                                    label={u.username}
                                />
                            ))}
                        </Box>
                    )}
                    <Button variant="contained" color="primary" sx={{ mt: 2 }}
                            onClick={startCall}
                            disabled={callType === 'personal' ? !selectedUser : selectedUsers.length === 0}>
                        Начать звонок
                    </Button>
                </Box>
            )}
            {callActive && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h5" gutterBottom>Звонок идет…</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={3}>
                            <Card>
                                <CardContent>
                                    <Typography>Вы</Typography>
                                    <video autoPlay muted playsInline
                                           ref={v => { if (v) v.srcObject = localStreamRef.current; }}
                                           style={{ width: '100%' }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>
                        {Object.entries(remoteStreams).map(([pid, tracks]) => (
                            <Grid item xs={3} key={pid}>
                                <Card>
                                    <CardContent>
                                        <Typography>Пользователь {pid}</Typography>
                                        {tracks.video[0] && (
                                            <video autoPlay playsInline
                                                   ref={v => { if (v) v.srcObject = new MediaStream([tracks.video[0]]); }}
                                                   style={{ width: '100%' }}
                                            />
                                        )}
                                        {tracks.audio && (
                                            <audio autoPlay
                                                   ref={a => { if (a) a.srcObject = new MediaStream([tracks.audio]); }}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Button onClick={() => { localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !micOn); setMicOn(!micOn); }} sx={{ mr: 1 }}>
                            {micOn ? <Mic /> : <MicOff />}
                        </Button>
                        <Button onClick={async () => {
                            if (!camOn) {
                                try {
                                    const cam = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
                                    camTrackRef.current = cam.getVideoTracks()[0];
                                    localStreamRef.current.addTrack(camTrackRef.current);
                                    setCamOn(true);
                                    for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                                        pc.addTrack(camTrackRef.current, localStreamRef.current);
                                        await renegotiate(pc, pid);
                                    }
                                } catch {}
                            } else {
                                if (camTrackRef.current) {
                                    localStreamRef.current.removeTrack(camTrackRef.current);
                                    camTrackRef.current.stop();
                                    setCamOn(false);
                                    for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                                        await renegotiate(pc, pid);
                                    }
                                }
                            }
                        }} sx={{ mr: 1 }}>
                            <Videocam color={camOn ? "primary" : "inherit"} />
                        </Button>
                        <Button onClick={async () => {
                            if (!screenOn) {
                                try {
                                    const scr = await navigator.mediaDevices.getDisplayMedia({ video: true });
                                    screenTrackRef.current = scr.getVideoTracks()[0];
                                    localStreamRef.current.addTrack(screenTrackRef.current);
                                    setScreenOn(true);
                                    for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                                        pc.addTrack(screenTrackRef.current, localStreamRef.current);
                                        await renegotiate(pc, pid);
                                    }
                                    screenTrackRef.current.onended = () => {};
                                } catch {
                                    alert("Не удалось начать шаринг экрана.");
                                }
                            } else {
                                if (screenTrackRef.current) {
                                    localStreamRef.current.removeTrack(screenTrackRef.current);
                                    screenTrackRef.current.stop();
                                    screenTrackRef.current = null;
                                    setScreenOn(false);
                                    for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                                        await renegotiate(pc, pid);
                                    }
                                }
                            }
                        }} sx={{ mr: 1 }}>
                            <ScreenShare color={screenOn ? "primary" : "inherit"} />
                        </Button>
                        <Button onClick={leaveCall} color="error">
                            <CallEnd />
                        </Button>
                    </Box>
                </Box>
            )}
        </Container>
    );
}
