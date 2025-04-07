// CallsPage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function CallsPage({ user }) {
    const navigate = useNavigate();
    const [callType, setCallType] = useState("personal");
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [callActive, setCallActive] = useState(false);
    const [callStartTime, setCallStartTime] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callParticipants, setCallParticipants] = useState([]);

    // Состояния для переключения вебкамеры/демонстрации
    const [isWebcamOn, setIsWebcamOn] = useState(false);
    const [isScreenSharingOn, setIsScreenSharingOn] = useState(false);

    // Создаем стабильный объект ограничений для аудио (без видео)
    const audioConstraints = useMemo(() => ({ audio: true, video: false }), []);

    // Ссылки на локальный поток и отдельные треки
    const localStreamRef = useRef(null);
    const webcamTrackRef = useRef(null);
    const screenTrackRef = useRef(null);

    // Храним remote поток для каждого peerId (только один поток на соединение)
    const [remoteStreams, setRemoteStreams] = useState({});

    // Объект для хранения RTCPeerConnection
    const peerConnections = useRef({});

    const createPeerConnection = useCallback((peerId) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_candidate', { to: peerId, from: user.id, candidate: event.candidate });
            }
        };
        // Вместо накопления нескольких потоков – просто перезаписываем remoteStreams[peerId]
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
        };
        peerConnections.current[peerId] = pc;
        return pc;
    }, [user.id]);

    const joinCall = useCallback(async (callerId) => {
        if (!localStreamRef.current) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
                localStreamRef.current = stream;
            } catch (err) {
                console.error("Ошибка получения аудио для входящего звонка:", err);
                return;
            }
        }
        setCallActive(true);
        setCallStartTime(new Date());
        if (!peerConnections.current[callerId]) {
            createPeerConnection(callerId);
        }
        setCallParticipants([callerId]);
    }, [audioConstraints, createPeerConnection]);

    // Функция renegotiation для обновления SDP
    const renegotiate = useCallback(async (pc, peerId) => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc_offer', { to: peerId, from: user.id, sdp: pc.localDescription });
        } catch (err) {
            console.error("Ошибка renegotiation:", err);
        }
    }, [user.id]);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        socket.emit('register_user', { user_id: user.id });
        fetch("http://localhost:5000/users")
            .then(res => res.json())
            .then(data => {
                const others = data.filter(u => u.id !== user.id);
                setAllUsers(others);
            })
            .catch(err => console.error("Ошибка загрузки пользователей:", err));

        socket.on('incoming_call', async (data) => {
            console.log("Входящий звонок от", data.from);
            setIncomingCall(data);
        });

        socket.on('webrtc_offer', async (data) => {
            const { from, sdp } = data;
            console.log("Получен offer от", from);
            const pc = createPeerConnection(from);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_answer', { to: from, from: user.id, sdp: pc.localDescription });
        });

        socket.on('webrtc_answer', async (data) => {
            const { from, sdp } = data;
            console.log("Получен answer от", from);
            const pc = peerConnections.current[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        socket.on('webrtc_candidate', async (data) => {
            const { from, candidate } = data;
            const pc = peerConnections.current[from];
            if (pc && candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Ошибка добавления ICE кандидата", e);
                }
            }
        });

        socket.on('end_call', (data) => {
            console.log("Получено событие завершения звонка", data);
            endCallLocal();
        });

        return () => {
            socket.off('incoming_call');
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_candidate');
            socket.off('end_call');
        };
    }, [user, navigate, createPeerConnection, joinCall]);

    const acceptIncomingCall = async () => {
        if (incomingCall) {
            await joinCall(incomingCall.from);
            setCallParticipants(prev => {
                if (!prev.includes(incomingCall.from)) return [...prev, incomingCall.from];
                return prev;
            });
            setIncomingCall(null);
        }
    };

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
            localStreamRef.current = stream;
            setCallActive(true);
            setCallStartTime(new Date());
            let targets = [];
            if (callType === "personal" && selectedUser) {
                targets.push(selectedUser);
            } else if (callType === "group" && selectedUsers.length > 0) {
                targets = selectedUsers;
            }
            setCallParticipants(targets);
            socket.emit('initiate_call', { from: user.id, callType, targets });
            targets.forEach(async (targetId) => {
                const pc = createPeerConnection(targetId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('webrtc_offer', { to: targetId, from: user.id, sdp: pc.localDescription });
            });
        } catch (err) {
            console.error("Ошибка получения аудио:", err);
        }
    };

    // Переключение вебкамеры: включает или выключает соответствующий трек
    const toggleWebcam = async () => {
        if (!localStreamRef.current) return;
        if (!isWebcamOn) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                webcamTrackRef.current = videoStream.getVideoTracks()[0];
                localStreamRef.current.addTrack(webcamTrackRef.current);
                setIsWebcamOn(true);
                Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(webcamTrackRef.current);
                    } else {
                        pc.addTrack(webcamTrackRef.current, localStreamRef.current);
                    }
                    await renegotiate(pc, peerId);
                });
            } catch (err) {
                console.error("Ошибка включения вебкамеры:", err);
            }
        } else {
            if (webcamTrackRef.current) {
                localStreamRef.current.removeTrack(webcamTrackRef.current);
                webcamTrackRef.current.stop();
                webcamTrackRef.current = null;
            }
            setIsWebcamOn(false);
            Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
                await renegotiate(pc, peerId);
            });
        }
    };

    // Переключение демонстрации экрана
    const toggleScreenShare = async () => {
        if (!localStreamRef.current) return;
        if (!isScreenSharingOn) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenTrackRef.current = screenStream.getVideoTracks()[0];
                localStreamRef.current.addTrack(screenTrackRef.current);
                setIsScreenSharingOn(true);
                Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(screenTrackRef.current);
                    } else {
                        pc.addTrack(screenTrackRef.current, localStreamRef.current);
                    }
                    await renegotiate(pc, peerId);
                });
                screenTrackRef.current.onended = () => {
                    toggleScreenShare();
                };
            } catch (err) {
                console.error("Ошибка демонстрации экрана:", err);
            }
        } else {
            if (screenTrackRef.current) {
                localStreamRef.current.removeTrack(screenTrackRef.current);
                screenTrackRef.current.stop();
                screenTrackRef.current = null;
            }
            setIsScreenSharingOn(false);
            Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
                await renegotiate(pc, peerId);
            });
        }
    };

    const endCallLocal = () => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setRemoteStreams({});
        setCallActive(false);
    };

    const endCall = () => {
        const endTime = new Date();
        endCallLocal();
        socket.emit('end_call', { from: user.id, targets: callParticipants });
        fetch('http://localhost:5000/call_history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                caller_id: user.id,
                call_type: callType,
                participants: "," + callParticipants.join(",") + ",",
                start_time: callStartTime.toISOString(),
                end_time: endTime.toISOString()
            })
        })
            .then(res => res.json())
            .then(data => {
                console.log("Call history saved:", data.message);
            });
    };

    return (
        <div className="container">
            <h2>Звонки</h2>
            {!callActive && incomingCall && (
                <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '20px' }}>
                    <p>Входящий звонок от пользователя ID {incomingCall.from}</p>
                    <button onClick={acceptIncomingCall}>Принять звонок</button>
                </div>
            )}
            {!callActive && !incomingCall && (
                <>
                    <div>
                        <label>
                            <input
                                type="radio"
                                name="callType"
                                value="personal"
                                checked={callType === "personal"}
                                onChange={() => setCallType("personal")}
                            /> Личный звонок
                        </label>
                        <label style={{ marginLeft: '20px' }}>
                            <input
                                type="radio"
                                name="callType"
                                value="group"
                                checked={callType === "group"}
                                onChange={() => setCallType("group")}
                            /> Групповой звонок
                        </label>
                    </div>
                    {callType === "personal" && (
                        <div>
                            <h3>Выберите пользователя для звонка:</h3>
                            <select onChange={(e) => setSelectedUser(e.target.value)} defaultValue="">
                                <option value="" disabled>Выберите пользователя</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {callType === "group" && (
                        <div>
                            <h3>Выберите участников группового звонка:</h3>
                            {allUsers.map(u => (
                                <div key={u.id}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            value={u.id}
                                            checked={selectedUsers.includes(u.id.toString())}
                                            onChange={(e) => {
                                                const id = u.id.toString();
                                                if (e.target.checked) {
                                                    setSelectedUsers(prev => [...prev, id]);
                                                } else {
                                                    setSelectedUsers(prev => prev.filter(uid => uid !== id));
                                                }
                                            }}
                                        /> {u.username}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={startCall} style={{ marginTop: '20px' }}>Начать звонок (голосовой)</button>
                </>
            )}
            {callActive && (
                <div>
                    <h3>Звонок идет...</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        <div style={{ marginRight: '20px' }}>
                            <h4>Ваш поток</h4>
                            {localStreamRef.current && (
                                <video
                                    autoPlay
                                    muted
                                    playsInline
                                    ref={video => {
                                        if (video && localStreamRef.current) {
                                            video.srcObject = localStreamRef.current;
                                        }
                                    }}
                                    style={{ width: "300px" }}
                                ></video>
                            )}
                        </div>
                        {Object.keys(remoteStreams).map(peerId => (
                            <div key={peerId} style={{ marginRight: '20px' }}>
                                <h4>Пользователь {peerId}</h4>
                                <video
                                    autoPlay
                                    playsInline
                                    ref={video => {
                                        if (video && remoteStreams[peerId]) {
                                            video.srcObject = remoteStreams[peerId];
                                        }
                                    }}
                                    style={{ width: "300px" }}
                                ></video>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <button onClick={toggleWebcam}>
                            {isWebcamOn ? 'Выключить вебкамеру' : 'Включить вебкамеру'}
                        </button>
                        <button onClick={toggleScreenShare} style={{ marginLeft: '10px' }}>
                            {isScreenSharingOn ? 'Выключить демонстрацию' : 'Включить демонстрацию экрана'}
                        </button>
                        <button onClick={endCall} style={{ marginLeft: '10px' }}>Завершить звонок</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CallsPage;
