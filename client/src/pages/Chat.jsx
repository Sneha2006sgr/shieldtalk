import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import { encrypt, decrypt } from '../utils/crypto';

// Colours
const MINE_BG     = '#005c4b';   // WhatsApp dark green
const MINE_BORDER = '#00a884';
const OTHER_BG    = '#1f2c34';   // WhatsApp dark grey
const OTHER_BORDER= '#2a3942';
const MINE_TEXT   = '#e9edef';
const OTHER_TEXT  = '#e9edef';
const TIME_COLOR  = '#8696a0';

export default function Chat() {
  const { user } = useAuth();
  const [params] = useSearchParams();

  // user._id may be stored as 'id' or '_id' depending on login response
  const myId = String(user?._id || user?.id || '');

  const [contacts,     setContacts]     = useState([]);
  const [groups,       setGroups]       = useState([]);
  const [tab,          setTab]          = useState('dm');
  const [selected,     setSelected]     = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [onlineIds,    setOnlineIds]    = useState([]);
  const [showEnc,      setShowEnc]      = useState(false);

  // Camera for in-chat media
  const [cameraOpen,   setCameraOpen]   = useState(false);
  const [cameraMode,   setCameraMode]   = useState('photo'); // 'photo'|'video'
  const [recording,    setRecording]    = useState(false);
  const videoRef    = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const camStreamRef= useRef(null);

  const bottomRef   = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  // ── Socket ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const sock = getSocket();
    const reg = () => sock.emit('register', myId);
    if (sock.connected) reg();
    sock.on('connect', reg);

    const onDM = (msg) => {
      const sel = selectedRef.current;
      if (!sel || sel.type !== 'dm') return;
      const sid = String(msg.senderId?._id || msg.senderId);
      const rid = String(msg.receiverId?._id || msg.receiverId);
      const oid = String(sel.data._id);
      if ((sid === myId && rid === oid) || (sid === oid && rid === myId)) {
        setMessages(p => p.some(m => m._id === msg._id) ? p : [...p, msg]);
      }
    };
    const onGroup = (msg) => {
      const sel = selectedRef.current;
      if (!sel || sel.type !== 'group') return;
      if (String(msg.groupId?._id || msg.groupId) === String(sel.data._id)) {
        setMessages(p => p.some(m => m._id === msg._id) ? p : [...p, msg]);
      }
    };
    const onOnline = (ids) => setOnlineIds(ids.map(String));

    sock.on('dm', onDM);
    sock.on('group_msg', onGroup);
    sock.on('online_users', onOnline);
    return () => {
      sock.off('connect', reg);
      sock.off('dm', onDM);
      sock.off('group_msg', onGroup);
      sock.off('online_users', onOnline);
    };
  }, [myId]);

  // ── Load contacts & groups ───────────────────────────────────────────
  useEffect(() => {
    api.get('/messages/contacts').then(r => {
      setContacts(r.data);
      const pre = params.get('user');
      if (pre) { const c = r.data.find(x => x._id === pre); if (c) setSelected({ type: 'dm', data: c }); }
    }).catch(() => {});
    api.get('/messages/groups').then(r => setGroups(r.data)).catch(() => {});
  }, []);

  // ── Load history ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    setMessages([]);
    if (selected.type === 'dm') {
      api.get(`/messages/conversation/${selected.data._id}`).then(r => setMessages(r.data)).catch(() => {});
    } else {
      api.get(`/messages/group/${selected.data._id}`).then(r => setMessages(r.data)).catch(() => {});
      getSocket().emit('join_group', selected.data._id);
    }
  }, [selected?.data?._id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Send text ────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !selected || sending) return;
    setInput(''); setSending(true); setShowEnc(true);
    const encryptedText = encrypt(text);
    try {
      const payload = selected.type === 'dm'
        ? { receiverId: selected.data._id, encryptedText, selfDestruct, destructAfterSeconds: 30 }
        : { groupId: selected.data._id, encryptedText, selfDestruct, destructAfterSeconds: 30 };
      const { data: saved } = await api.post('/messages', payload);
      setMessages(p => p.some(m => m._id === saved._id) ? p : [...p, saved]);
      const sock = getSocket();
      if (selected.type === 'dm') sock.emit('dm', saved);
      else sock.emit('group_msg', saved);
    } catch { setInput(text); }
    finally { setSending(false); setTimeout(() => setShowEnc(false), 400); }
  }, [input, selected, sending, selfDestruct]);

  // ── Send media blob ──────────────────────────────────────────────────
  const sendMedia = async (blob, type) => {
    if (!selected) return;
    const fd = new FormData();
    fd.append('file', blob, type === 'video' ? 'capture.webm' : 'capture.jpg');
    if (selected.type === 'dm') fd.append('receiverId', selected.data._id);
    else fd.append('groupId', selected.data._id);
    try {
      const { data: saved } = await api.post('/messages/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessages(p => p.some(m => m._id === saved._id) ? p : [...p, saved]);
      const sock = getSocket();
      if (selected.type === 'dm') sock.emit('dm', saved);
      else sock.emit('group_msg', saved);
    } catch {}
  };

  // ── Camera helpers ───────────────────────────────────────────────────
  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      camStreamRef.current = s;
      setCameraOpen(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } }, 80);
    } catch { alert('Camera access denied'); }
  };

  const closeCamera = () => {
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current = null;
    setCameraOpen(false); setRecording(false);
  };

  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
    canvas.getContext('2d').drawImage(v, 0, 0);
    canvas.toBlob(blob => { if (blob) sendMedia(blob, 'image'); }, 'image/jpeg', 0.85);
    closeCamera();
  };

  const startRecording = () => {
    chunksRef.current = [];
    const mr = new MediaRecorder(camStreamRef.current);
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      sendMedia(blob, 'video');
      closeCamera();
    };
    mediaRecRef.current = mr;
    mr.start(); setRecording(true);
  };

  const stopRecording = () => { mediaRecRef.current?.stop(); setRecording(false); };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const isOnline = (id) => onlineIds.includes(String(id));

  // ── Bubble ───────────────────────────────────────────────────────────
  const Bubble = ({ msg }) => {
    const SERVER = import.meta.env.VITE_API_URL || '';
    const sid    = String(msg.senderId?._id || msg.senderId);
    const isMine = sid === myId;
    const text   = msg.encryptedText ? decrypt(msg.encryptedText) : null;
    const name   = msg.senderId?.name || '?';
    const time   = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 4, width: '100%' }}>
        {/* Avatar for received messages */}
        {!isMine && (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a3942', color: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ maxWidth: '65%' }}>
          {/* Sender name in groups */}
          {!isMine && selected?.type === 'group' && (
            <p style={{ fontSize: 10, color: '#00a884', margin: '0 0 2px 4px', fontFamily: 'monospace' }}>{name}</p>
          )}
          <div style={{
            background: isMine ? MINE_BG : OTHER_BG,
            border: `1px solid ${isMine ? MINE_BORDER : OTHER_BORDER}`,
            color: isMine ? MINE_TEXT : OTHER_TEXT,
            borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding: msg.mediaUrl ? '4px' : '8px 12px',
            minWidth: 80,
          }}>
            {/* Media content */}
            {msg.mediaUrl && msg.mediaType === 'image' && (
              <img src={`${SERVER}${msg.mediaUrl}`} alt="shared"
                style={{ maxWidth: 240, maxHeight: 200, borderRadius: 8, display: 'block', objectFit: 'cover' }}
                draggable={false} onContextMenu={e => e.preventDefault()} />
            )}
            {msg.mediaUrl && msg.mediaType === 'video' && (
              <video src={`${SERVER}${msg.mediaUrl}`} controls
                style={{ maxWidth: 240, maxHeight: 200, borderRadius: 8, display: 'block' }}
                onContextMenu={e => e.preventDefault()} />
            )}
            {/* Text content */}
            {text && (
              <p style={{ fontSize: 14, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: msg.mediaUrl ? '4px 8px 0' : 0 }}>
                {text}
              </p>
            )}
            {/* Timestamp row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3, padding: msg.mediaUrl ? '0 6px 4px' : 0 }}>
              {msg.selfDestruct && <span style={{ fontSize: 9, color: '#f59e0b' }}>⏱</span>}
              <span style={{ fontSize: 10, color: TIME_COLOR }}>{time}</span>
              {isMine && <span style={{ fontSize: 11, color: '#53bdeb' }}>✓✓</span>}
            </div>
          </div>
        </div>
        {/* Spacer for sent messages */}
        {isMine && <div style={{ width: 28, flexShrink: 0, marginLeft: 6 }} />}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 32px)', overflow: 'hidden', background: 'var(--bg-primary)' }}
      onDrop={e => e.preventDefault()} onDragOver={e => e.preventDefault()}>

      {/* Contact list */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {['dm', 'groups'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: 'none', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent' }}>
              {t === 'dm' ? '👤 DIRECT' : '👥 GROUPS'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'dm' && contacts.map(c => (
            <button key={c._id} onClick={() => setSelected({ type: 'dm', data: c })}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', background: selected?.data?._id === c._id ? 'var(--accent-dim)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--bg-card)', background: isOnline(c._id) ? '#22c55e' : '#64748b' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                <p style={{ fontSize: 11, color: isOnline(c._id) ? '#22c55e' : 'var(--text-muted)', margin: 0 }}>{isOnline(c._id) ? '● online' : '○ offline'}</p>
              </div>
            </button>
          ))}
          {tab === 'groups' && groups.map(g => (
            <button key={g._id} onClick={() => setSelected({ type: 'group', data: g })}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', background: selected?.data?._id === g._id ? 'var(--accent-dim)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, background: 'var(--accent-dim)' }}>👥</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{g.members?.length} members</p>
              </div>
            </button>
          ))}
          {tab === 'dm' && contacts.length === 0 && <p style={{ padding: 16, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', textAlign: 'center' }}>No contacts yet</p>}
          {tab === 'groups' && groups.length === 0 && <p style={{ padding: 16, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', textAlign: 'center' }}>No groups yet</p>}
        </div>
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            {/* Header */}
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {selected.type === 'group' ? '👥' : selected.data.name[0].toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{selected.data.name}</p>
                <p style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)' }}>
                  {selected.type === 'dm' ? (isOnline(selected.data._id) ? '● ONLINE' : '○ OFFLINE') : `${selected.data.members?.length} MEMBERS`}
                  {' · '}🔒 E2E ENCRYPTED
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#8696a0' }}>No messages yet — start a secure conversation</p>
                </div>
              )}
              {messages.map((msg, i) => <Bubble key={msg._id || i} msg={msg} />)}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{ padding: '8px 12px', background: '#1f2c34', borderTop: '1px solid #2a3942', flexShrink: 0 }}>
              {showEnc && <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#00a884', marginBottom: 4 }}>🔐 ENCRYPTING...</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Camera button — NO file manager */}
                <button onClick={openCamera} title="Capture photo or video"
                  style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', background: 'transparent', border: '1px solid #2a3942', color: '#8696a0' }}>
                  📷
                </button>
                {/* Self-destruct */}
                <button onClick={() => setSelfDestruct(s => !s)} title="Self-destruct 30s"
                  style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', background: selfDestruct ? 'rgba(245,158,11,0.15)' : 'transparent', border: `1px solid ${selfDestruct ? '#f59e0b' : '#2a3942'}`, color: selfDestruct ? '#f59e0b' : '#8696a0' }}>
                  ⏱
                </button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                  onCopy={e => e.preventDefault()} onPaste={e => e.preventDefault()} onCut={e => e.preventDefault()}
                  placeholder="Type a secure message…"
                  style={{ flex: 1, padding: '9px 16px', borderRadius: 24, fontSize: 13, fontFamily: 'monospace', outline: 'none', background: '#2a3942', border: 'none', color: '#e9edef' }} />
                <button onClick={send} disabled={sending || !input.trim()}
                  style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', background: '#00a884', color: '#fff', border: 'none', opacity: sending || !input.trim() ? 0.4 : 1 }}>
                  ➤
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b141a' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#8696a0' }}>Select a contact or group to start chatting</p>
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#8696a0', marginTop: 4 }}>All messages are AES-256 encrypted</p>
            </div>
          </div>
        )}
      </div>

      {/* ── In-chat camera modal ── */}
      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2c34', borderRadius: 16, padding: 20, width: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#00a884', textAlign: 'center', letterSpacing: 2 }}>SECURE CAMERA</p>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {['photo', 'video'].map(m => (
                <button key={m} onClick={() => setCameraMode(m)}
                  style={{ padding: '4px 16px', borderRadius: 20, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', background: cameraMode === m ? '#00a884' : 'transparent', border: '1px solid #00a884', color: cameraMode === m ? '#000' : '#00a884' }}>
                  {m === 'photo' ? '📷 PHOTO' : '🎥 VIDEO'}
                </button>
              ))}
            </div>
            {/* Video preview */}
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {recording && (
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 10, color: '#fff', fontFamily: 'monospace' }}>REC</span>
                </div>
              )}
            </div>
            {/* Controls */}
            <div style={{ display: 'flex', gap: 10 }}>
              {cameraMode === 'photo' ? (
                <button onClick={capturePhoto} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#00a884', color: '#000', border: 'none', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  CAPTURE & SEND
                </button>
              ) : (
                <button onClick={recording ? stopRecording : startRecording}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: recording ? '#ef4444' : '#00a884', color: recording ? '#fff' : '#000', border: 'none', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {recording ? '⏹ STOP & SEND' : '⏺ START RECORDING'}
                </button>
              )}
              <button onClick={closeCamera} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #2a3942', color: '#8696a0', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
