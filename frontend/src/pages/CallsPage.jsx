// src/pages/CallsPage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './CallsPage.css';

const socket = io('http://localhost:5000');

export default function CallsPage({ user }) {
    const navigate = useNavigate();

    /* ------------------------------------------------- Состояние UI */
    const [callType, setCallType]             = useState('personal');
    const [allUsers, setAllUsers]             = useState([]);
    const [selectedUser, setSelectedUser]     = useState('');
    const [selectedUsers, setSelectedUsers]   = useState([]);

    const [callActive, setCallActive]         = useState(false);
    const [callStart, setCallStart]           = useState(null);
    const [incomingCall, setIncomingCall]     = useState(null);
    const [participants, setParticipants]     = useState([]);

    const [micOn, setMicOn]                   = useState(true);
    const [camOn, setCamOn]                   = useState(false);
    const [screenOn, setScreenOn]             = useState(false);

    /* -------------------------- локальные медиа-данные и пиры ------------- */
    const audioOnly          = useMemo(() => ({ audio: true, video: false }), []);
    const camOnly            = useMemo(() => ({ video: true }), []);
    const screenVid          = useMemo(() => ({ video: true }), []);

    const localStreamRef     = useRef(null);
    const camTrackRef        = useRef(null);
    const screenTrackRef     = useRef(null);

    // remoteStreams: { peerId: { audio: MediaStreamTrack|null, video: MediaStreamTrack[] } }
    const [remoteStreams, setRemoteStreams] = useState({});
    const peerConnsRef      = useRef({});

    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    /* ------------------------ хелпер для повторного согласования SDP ---------------- */
    const renegotiate = useCallback(async (pc, peerId) => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { to: peerId, from: user.id, sdp: pc.localDescription });
    }, [user.id]);

    /* ---------------------- создание RTCPeerConnection ------------ */
    const createPC = useCallback(peerId => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // добавить все текущие локальные треки
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        pc.onicecandidate = e => {
            if (e.candidate) {
                socket.emit('webrtc_candidate', { to: peerId, from: user.id, candidate: e.candidate });
            }
        };

        pc.ontrack = e => {
            if (!mounted.current) return;

            setRemoteStreams(prev => {
                const entry = prev[peerId] ?? { audio: null, video: [] };
                if (e.track.kind === 'audio') entry.audio = e.track;
                else {
                    // не дублировать видеотреки
                    if (!entry.video.some(v => v.id === e.track.id)) entry.video.push(e.track);
                }
                return { ...prev, [peerId]: entry };
            });
        };

        peerConnsRef.current[peerId] = pc;
        return pc;
    }, [user.id]);

    /* -------------------------- WebSocket-события ------------------------- */
    useEffect(() => {
        if (!user) { navigate('/'); return; }

        // загрузить список друзей
        fetch(`http://localhost:5000/friends/${user.id}`)
            .then(r => r.json())
            .then(d => mounted.current && setAllUsers(d))
            .catch(console.error);

        socket.emit('register_user', { user_id: user.id });

        // когда кто-то звонит
        socket.on('incoming_call', d => mounted.current && setIncomingCall(d));

        // обработка входящего предложения (offer) от пира
        socket.on('webrtc_offer', async d => {
            const pc = createPC(d.from);
            await pc.setRemoteDescription(new RTCSessionDescription(d.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_answer', { to: d.from, from: user.id, sdp: pc.localDescription });
        });

        // прием ответа (answer) на наше предложение
        socket.on('webrtc_answer', async d => {
            const pc = peerConnsRef.current[d.from];
            pc && await pc.setRemoteDescription(new RTCSessionDescription(d.sdp));
        });

        // получение ICE-кандидатов
        socket.on('webrtc_candidate', async d => {
            const pc = peerConnsRef.current[d.from];
            pc && d.candidate && await pc.addIceCandidate(new RTCIceCandidate(d.candidate));
        });

        // завершение звонка
        socket.on('end_call', leaveCallSilent);

        return () => socket.removeAllListeners();
    }, [user, navigate, createPC]);

    /* ------------------------- логика звонков ------------------------ */
    const ensureBaseAudio = async () => {
        if (!localStreamRef.current) {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia(audioOnly);
        }
    };

    const joinPeers = async (tgt, answerMode) => {
        await ensureBaseAudio();
        setCallActive(true);
        setCallStart(new Date());
        setParticipants(tgt);

        if (!answerMode)
            socket.emit('initiate_call', { from: user.id, callType, targets: tgt });

        for (const pid of tgt) {
            const pc = createPC(pid);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc_offer', { to: pid, from: user.id, sdp: pc.localDescription });
        }
    };

    const acceptCall = () => {
        if (!incomingCall) return;
        joinPeers([incomingCall.from], true);
        setIncomingCall(null);
    };

    const startCall = () => {
        const targets = callType === 'personal'
            ? [selectedUser]
            : selectedUsers.filter(Boolean);
        if (targets.length) joinPeers(targets, false);
    };

    /* -------------------- переключение медиа ------------------------ */
    const toggleMic = () => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !micOn; });
        setMicOn(p => !p);
    };

    const toggleCam = async () => {
        if (!localStreamRef.current) return;
        if (!camOn) {
            const cam = await navigator.mediaDevices.getUserMedia(camOnly);
            camTrackRef.current = cam.getVideoTracks()[0];
            localStreamRef.current.addTrack(camTrackRef.current);
            setCamOn(true);
            // при добавлении камеры обновляем SDP для всех пиров
            for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                pc.addTrack(camTrackRef.current, localStreamRef.current);
                await renegotiate(pc, pid);
            }
        } else {
            localStreamRef.current.removeTrack(camTrackRef.current);
            camTrackRef.current.stop();
            setCamOn(false);
            for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                await renegotiate(pc, pid);
            }
        }
    };

    const toggleScreen = async () => {
        if (!localStreamRef.current) return;
        if (!screenOn) {
            const scr = await navigator.mediaDevices.getDisplayMedia(screenVid);
            screenTrackRef.current = scr.getVideoTracks()[0];
            localStreamRef.current.addTrack(screenTrackRef.current);
            setScreenOn(true);
            for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                pc.addTrack(screenTrackRef.current, localStreamRef.current);
                await renegotiate(pc, pid);
            }
            // когда пользователь прекращает шарить экран
            screenTrackRef.current.onended = toggleScreen;
        } else {
            localStreamRef.current.removeTrack(screenTrackRef.current);
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
            setScreenOn(false);
            for (const [pid, pc] of Object.entries(peerConnsRef.current)) {
                await renegotiate(pc, pid);
            }
        }
    };

    /* -------------------- завершение и история звонков ------------------------ */
    const cleanUp = () => {
        Object.values(peerConnsRef.current).forEach(pc => pc.close());
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
    };

    const leaveCallSilent = () => cleanUp();

    const leaveCall = () => {
        socket.emit('end_call', { from: user.id, targets: participants });
        if (callStart) {
            fetch('http://localhost:5000/call_history', {
                method: 'POST',
                headers: { 'Content-Type':'application/json' },
                body: JSON.stringify({
                    caller_id: user.id,
                    call_type: callType,
                    participants: `,${participants.join(',')},`,
                    start_time: callStart.toISOString(),
                    end_time: new Date().toISOString()
                })
            }).catch(console.error);
        }
        cleanUp();
    };

    /* ------------------------- рендер -------------------------- */
    return (
        <div className="calls-page-container container">
            <h2>Звонки</h2>

            {/* Входящий звонок */}
            {!callActive && incomingCall && (
                <div className="incoming-call-alert">
                    <p>Входящий звонок от ID {incomingCall.from}</p>
                    <button onClick={acceptCall}>Принять</button>
                    <button onClick={() => setIncomingCall(null)} style={{ marginLeft: 8 }}>
                        Отклонить
                    </button>
                </div>
            )}

            {/* Подготовка к звонку */}
            {!callActive && !incomingCall && (
                <>
                    <div className="call-type-choice">
                        <label><input type="radio" value="personal"
                                      checked={callType === 'personal'} onChange={()=>setCallType('personal')} /> Личный</label>
                        <label><input type="radio" value="group"
                                      checked={callType === 'group'} onChange={()=>setCallType('group')} /> Групповой</label>
                    </div>

                    {callType === 'personal' && (
                        <div className="select-user-block">
                            <h3>Выберите друга:</h3>
                            <select defaultValue="" onChange={e=>setSelectedUser(e.target.value)}>
                                <option value="" disabled>-- Выберите --</option>
                                {allUsers.map(u=> <option key={u.id} value={u.id}>{u.username}</option>)}
                            </select>
                        </div>
                    )}

                    {callType === 'group' && (
                        <div className="select-user-block">
                            <h3>Участники:</h3>
                            {allUsers.map(u=>(
                                <label key={u.id}>
                                    <input type="checkbox" value={u.id}
                                           checked={selectedUsers.includes(String(u.id))}
                                           onChange={e=>{
                                               const id = String(u.id);
                                               setSelectedUsers(p=> e.target.checked ? [...p,id] : p.filter(x=>x!==id));
                                           }}/> {u.username}
                                </label>
                            ))}
                        </div>
                    )}

                    <button onClick={startCall} className="start-call-button">Начать звонок</button>
                </>
            )}

            {/* Активный звонок */}
            {callActive && (
                <div className="call-active-block">
                    <h3>Звонок идёт…</h3>

                    <div className="video-streams-container">
                        {/* свой поток */}
                        <div className="video-block">
                            <h4>Вы</h4>
                            <video autoPlay muted playsInline ref={v=>v&&(v.srcObject = localStreamRef.current)} />
                        </div>

                        {/* потоки собеседников */}
                        {Object.entries(remoteStreams).map(([pid, obj])=>(
                            <div className="video-block" key={pid}>
                                <h4>Пользователь {pid}</h4>

                                {/* камера */}
                                {obj.video[0] && (
                                    <video
                                        autoPlay playsInline
                                        ref={v => v && (v.srcObject = new MediaStream([obj.video[0]]))}
                                    />
                                )}

                                {/* экран */}
                                {obj.video[1] && (
                                    <video
                                        autoPlay playsInline style={{ marginTop: 8 }}
                                        ref={v => v && (v.srcObject = new MediaStream([obj.video[1]]))}
                                    />
                                )}

                                {/* звук без UI */}
                                {obj.audio && (
                                    <audio
                                        autoPlay
                                        ref={a => a && (a.srcObject = new MediaStream([obj.audio]))}
                                        style={{ display:'none' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="call-controls">
                        <button onClick={toggleMic} className="toggle-mic-btn">
                            {micOn ? 'Выключить микрофон' : 'Включить микрофон'}
                        </button>
                        <button onClick={toggleCam} className="toggle-webcam-btn">
                            {camOn ? 'Выключить камеру' : 'Включить камеру'}
                        </button>
                        <button onClick={toggleScreen} className="toggle-share-btn">
                            {screenOn ? 'Остановить шаринг' : 'Поделиться экраном'}
                        </button>
                        <button onClick={leaveCall} className="end-call-btn">Завершить</button>
                    </div>
                </div>
            )}
        </div>
    );
}
