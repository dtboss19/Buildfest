import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AnonymousToggle } from '../components/AnonymousToggle';
import { formatRelativeTime } from '../utils/formatDate';
import { getSeedChatRooms, getSeedChatMessagesByRoomId, SEED_CHAT_ROOM_IDS } from '../data/seedData';
import type { ChatRoom, ChatMessage } from '../types/database';
import './CommunityChatPage.css';

const ANONYMOUS_DISPLAY = 'Anonymous';
const FAKE_MEMBER_COUNT = 24;
const PREVIEW_MESSAGE_COUNT = 3;

export function CommunityChatPage() {
  const { user } = useAuth();
  const { withAuth } = useRequireAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.from('chat_rooms').select('*').eq('type', 'topic').order('name', { ascending: true });
        if (!mounted) return;
        const list = (data ?? []) as ChatRoom[];
        setRooms(list.length > 0 ? list : getSeedChatRooms());
        if (list.length > 0 && !selectedRoomId) setSelectedRoomId(list[0].id);
        else if (list.length === 0) setSelectedRoomId(getSeedChatRooms()[0].id);
      } catch {
        if (mounted) {
          setRooms(getSeedChatRooms());
          setSelectedRoomId(getSeedChatRooms()[0].id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    const isSeedRoom = selectedRoomId.startsWith('seed-');
    if (isSeedRoom) {
      setMessages(getSeedChatMessagesByRoomId(selectedRoomId));
      return;
    }
    const p = supabase.from('chat_messages').select('*').eq('room_id', selectedRoomId).order('created_at', { ascending: true }).then(({ data }) => {
      setMessages((data ?? []) as ChatMessage[]);
    });
    void Promise.resolve(p).catch((err: unknown) => {
      // #region agent log
      fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f0ee74' }, body: JSON.stringify({ sessionId: 'f0ee74', location: 'CommunityChatPage.tsx:chat_messages', message: 'rejection', data: { err: String(err) }, hypothesisId: 'H2', timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      setMessages([]);
    });
    const channel = supabase.channel(`room:${selectedRoomId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoomId}` }, (payload) => {
      setMessages((prev) => [...prev, payload.new as ChatMessage]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoomId]);

  const sendMessage = () => withAuth(async () => {
    if (!user || !selectedRoomId || !content.trim()) return;
    if (selectedRoomId.startsWith('seed-')) return; // seed room, no send
    await supabase.from('chat_messages').insert({ room_id: selectedRoomId, user_id: user.id, content: content.trim(), is_anonymous: isAnonymous });
    setContent('');
  });

  const getPreviewMessages = (roomId: string): ChatMessage[] => {
    const msgs = roomId.startsWith('seed-') ? getSeedChatMessagesByRoomId(roomId) : [];
    return msgs.slice(-PREVIEW_MESSAGE_COUNT);
  };

  const getUnreadCount = (roomId: string): number => {
    if (roomId === SEED_CHAT_ROOM_IDS['General Discussion']) return 3;
    return 0;
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="community-chat-page">
      <h1>Community chat</h1>
      <div className="chat-layout">
        <aside className="chat-rooms-sidebar">
          {rooms.map((r) => {
            const preview = getPreviewMessages(r.id);
            const unread = getUnreadCount(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className={selectedRoomId === r.id ? 'active' : ''}
                onClick={() => setSelectedRoomId(r.id)}
              >
                <span className="chat-room-name">{r.name}</span>
                <span className="chat-room-meta"> · {FAKE_MEMBER_COUNT} members</span>
                {unread > 0 && <span className="chat-room-unread">{unread}</span>}
                {preview.length > 0 && (
                  <div className="chat-room-preview">
                    {preview.map((m) => (
                      <div key={m.id} className="chat-room-preview-msg">
                        {m.is_anonymous ? ANONYMOUS_DISPLAY : 'User'}: {m.content.slice(0, 40)}{m.content.length > 40 ? '…' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </aside>
        <div className="chat-main">
          {selectedRoomId && (
            <>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className="chat-msg">
                    <span className="chat-msg-name">{m.is_anonymous ? ANONYMOUS_DISPLAY : 'User'}</span>
                    <span className="chat-msg-content">{m.content}</span>
                    <span className="chat-msg-time">{formatRelativeTime(m.created_at)}</span>
                  </div>
                ))}
              </div>
              {selectedRoomId.startsWith('seed-') ? (
                <div className="chat-signin-bar">Seed demo room — use a real room to send messages.</div>
              ) : (
                <form className="chat-input-form" onSubmit={(e) => { e.preventDefault(); sendMessage()(); }}>
                  <AnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} label="Send anonymously" />
                  <input type="text" placeholder="Type a message…" value={content} onChange={(e) => setContent(e.target.value)} />
                  <button type="submit" className="btn btn-primary">Send</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
