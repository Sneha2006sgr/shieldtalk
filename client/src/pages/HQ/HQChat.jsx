import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';
import { encrypt, decrypt } from '../../utils/crypto';

export default function HQChat({ myId, userName }) {  const [contacts,  setContacts]  = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [tab,       setTab]       = useState('dm');
  const [selected,  setSelected]  = useState(null); // {type, data}
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [online,    setOnline]    = useState([]);
  const bottomRef   = useRef(null);
  const selRef      = useRef(null);
  selRef.current    = selected;

  useEffect(() => {
    const sock = getSocket();
    const reg = () => sock.emit('register', myId);
    if (sock.connected) reg();
    sock.on('connect', reg);

    const onDM = (msg) => {
      const sel = selRef.current;
      if (!sel || sel.type !== 'dm') return;
      const sid = String(msg.senderId?._id || msg.senderId);
      const rid = String(msg.receiverId?._id || msg.receiverId);
      const oid = String(sel.data._id);
      if ((sid === myId && rid === oid) || (sid === oid && rid === myId)) {
        setMessages(p => p.some(m => m._id === msg._id) ? p : [...p, msg]);
      }
    };
    const onGrp = (msg) => {
      const sel = selRef.current;
      if (!sel || sel.type !== 'group') return;
      if (String(msg.groupId?._id || msg.groupId) === String(sel.data._id)) {
        setMessages(p => p.some(m => m._id === msg._id) ? p : [...p, msg]);
      }
    };
    const onOnline = (ids) => setOnline(ids.map(String));

    sock.on('dm', onDM);
    sock.on('group_msg', onGrp);
    sock.on('online_users', onOnline);
    return () => {
      sock.off('connect', reg);
      sock.off('dm', onDM);
      sock.off('group_msg', onGrp);
      sock.off('online_users', onOnline);
    };
  }, [myId]);

  useEffect(() => {
    api.get('/messages/contacts').then(r => setContacts(r.data)).catch(() => {});
    api.get('/messages/groups').then(r => setGroups(r.data)).catch(() => {});
  }, []);

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

  const send = async () => {
    const text = input.trim();
    if (!text || !selected || sending) return;
    setInput(''); setSending(true);
    try {
      const payload = selected.type === 'dm'
        ? { receiverId: selected.data._id, encryptedText: encrypt(text) }
        : { groupId: selected.data._id,    encryptedText: encrypt(text) };
      const { data: msg } = await api.post('/messages', payload);
      setMessages(p => p.some(m => m._id === msg._id) ? p : [...p, msg]);
      const sock = getSocket();
      if (selected.type === 'dm') sock.emit('dm', msg);
      else sock.emit('group_msg', msg);
    } catch {}
    setSending(false);
  };

  const isOnline = (id) => online.includes(String(id));

  const Bubble = ({ msg }) => {
    const sid = String(msg.senderId?._id || msg.senderId);
    const mine = sid === String(myId);
    const text = msg.encryptedText ? decrypt(msg.encryptedText) : null;
    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const name = msg.senderId?.name || '?';
    const SERVER = import.meta.env.VITE_API_URL || '';
    return (
      <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 6, width: '100%' }}>
        {!mine && (
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2a3942', color: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ maxWidth: '65%' }}>
          {!mine && selected?.type === 'group' && (
            <p style={{ fontSize: 10, color: '#00a884', margin: '0 0 2px 4px', fontFamily: 'monospace' }}>{name}</p>
          )}
          <div style={{
            padding: msg.mediaUrl ? '4px' : '8px 12px',
            borderRadius: mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            background: mine ? '#005c4b' : '#1f2c34',
            border: `1px solid ${mine ? '#00a884' : '#2a3942'}`,
            color: '#e9edef',
          }}>
            {msg.mediaUrl && msg.mediaType === 'image' && (
              <img src={`${SERVER}${msg.mediaUrl}`} alt="shared"
                style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, display: 'block', objectFit: 'cover' }}
                draggable={false} onContextMenu={e => e.preventDefault()} />
            )}
            {msg.mediaUrl && msg.mediaType === 'video' && (
              <video src={`${SERVER}${msg.mediaUrl}`} controls
                style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, display: 'block' }}
                onContextMenu={e => e.preventDefault()} />
            )}
            {text && <p style={{ margin: msg.mediaUrl ? '4px 8px 0' : 0, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{text}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 3, padding: msg.mediaUrl ? '0 6px 4px' : 0 }}>
              <span style={{ fontSize: 10, color: '#8696a0' }}>{time}</span>
              {mine && <span style={{ fontSize: 11, color: '#53bdeb' }}>✓✓</span>}
            </div>
          </div>
        </div>
        {mine && <div style={{ width: 26, flexShrink: 0, marginLeft: 6 }} />}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '70vh', border: '1px solid rgba(0,255,100,0.15)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: 'rgba(2,11,24,0.9)', borderRight: '1px solid rgba(0,255,100,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,255,100,0.1)' }}>
          {['dm', 'groups'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer',
              background: 'transparent', border: 'none',
              color: tab === t ? '#00ff64' : '#475569',
              borderBottom: tab === t ? '2px solid #00ff64' : '2px solid transparent',
            }}>
              {t === 'dm' ? '👤 DIRECT' : '👥 GROUPS'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'dm' && contacts.map(c => (
            <button key={c._id} onClick={() => setSelected({ type: 'dm', data: c })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: selected?.data?._id === c._id ? 'rgba(0,255,100,0.08)' : 'transparent',
              border: 'none', borderBottom: '1px solid rgba(0,255,100,0.05)', cursor: 'pointer',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,100,50,0.4)', color: '#00ff64', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: isOnline(c._id) ? '#22c55e' : '#475569', border: '1px solid #020b18' }} />
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: isOnline(c._id) ? '#22c55e' : '#475569' }}>{isOnline(c._id) ? '● online' : '○ offline'}</p>
              </div>
            </button>
          ))}
          {tab === 'groups' && groups.map(g => (
            <button key={g._id} onClick={() => setSelected({ type: 'group', data: g })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: selected?.data?._id === g._id ? 'rgba(0,255,100,0.08)' : 'transparent',
              border: 'none', borderBottom: '1px solid rgba(0,255,100,0.05)', cursor: 'pointer',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,100,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👥</div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>{g.members?.length} members</p>
              </div>
            </button>
          ))}
          {tab === 'dm' && contacts.length === 0 && <p style={{ padding: 12, fontSize: 10, color: '#475569', fontFamily: 'monospace', textAlign: 'center' }}>No contacts</p>}
          {tab === 'groups' && groups.length === 0 && <p style={{ padding: 12, fontSize: 10, color: '#475569', fontFamily: 'monospace', textAlign: 'center' }}>No groups</p>}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'rgba(2,11,24,0.6)' }}>
        {selected ? (
          <>
            <div style={{ padding: '8px 14px', background: 'rgba(2,11,24,0.9)', borderBottom: '1px solid rgba(0,255,100,0.1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,100,50,0.4)', color: '#00ff64', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: selected.type === 'group' ? 14 : 12, fontWeight: 700 }}>
                {selected.type === 'group' ? '👥' : selected.data.name[0].toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0' }}>{selected.data.name}</p>
                <p style={{ margin: 0, fontSize: 10, fontFamily: 'monospace', color: '#00ff64' }}>
                  {selected.type === 'dm' ? (isOnline(selected.data._id) ? '● ONLINE' : '○ OFFLINE') : `${selected.data.members?.length} MEMBERS`} · 🔒 E2E ENCRYPTED
                </p>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column' }}>
              {messages.length === 0 && <p style={{ textAlign: 'center', color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 40 }}>No messages yet</p>}
              {messages.map((m, i) => <Bubble key={m._id || i} msg={m} />)}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '8px 10px', background: 'rgba(2,11,24,0.9)', borderTop: '1px solid rgba(0,255,100,0.1)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                onCopy={e => e.preventDefault()} onPaste={e => e.preventDefault()} onCut={e => e.preventDefault()}
                placeholder="Type secure message…"
                style={{ flex: 1, padding: '8px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'monospace', outline: 'none', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,100,0.2)', color: '#e2e8f0' }}
              />
              <button onClick={send} disabled={sending || !input.trim()} style={{ width: 34, height: 34, borderRadius: '50%', background: '#00ff64', color: '#000', border: 'none', cursor: 'pointer', fontSize: 14, opacity: sending || !input.trim() ? 0.4 : 1 }}>➤</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>Select a contact or group to chat</p>
          </div>
        )}
      </div>
    </div>
  );
}
