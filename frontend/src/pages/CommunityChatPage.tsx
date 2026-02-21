import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AnonymousToggle } from '../components/AnonymousToggle';
import { hasApiConfig, apiGetChatRooms, apiGetChatMessages, apiPostChatMessage } from '../lib/api';
import { formatRelativeTime } from '../utils/formatDate';
import { getSeedChatRooms, getSeedChatMessagesByRoomId, SEED_CHAT_ROOM_IDS } from '../data/seedData';
import type { ChatRoom, ChatMessage } from '../types/database';
import './CommunityChatPage.css';

const ANONYMOUS_DISPLAY = 'Anonymous';
const PREVIEW_MESSAGE_COUNT = 3;

export function CommunityChatPage() {
  const { user, ensureAnonymousSession } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [displayNamesByUserId, setDisplayNamesByUserId] = useState<Record<string, string>>({});
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const useApi = hasApiConfig();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (useApi) {
        setRoomsError(null);
        try {
          const list = await apiGetChatRooms();
          if (!mounted) return;
          const roomList = (list ?? []) as ChatRoom[];
          setRooms(roomList);
          setSelectedRoomId(roomList.length > 0 ? roomList[0].id : null);
        } catch (e) {
          if (mounted) {
            setRooms([]);
            setSelectedRoomId(null);
            setRoomsError(e instanceof Error ? e.message : 'Unable to load chat rooms.');
          }
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }
      try {
        const { data } = await supabase.from('chat_rooms').select('*').eq('type', 'topic').order('name', { ascending: true });
        if (!mounted) return;
        const list = (data ?? []) as ChatRoom[];
        setRooms(list.length > 0 ? list : getSeedChatRooms());
        if (list.length > 0) setSelectedRoomId(list[0].id);
        else setSelectedRoomId(getSeedChatRooms()[0].id);
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
  }, [useApi]);

  const fetchApiMessages = useCallback(async (roomId: string) => {
    const list = await apiGetChatMessages(roomId);
    const asChat: ChatMessage[] = list.map((m) => ({
      ...m,
      user_id: (m as { user_id?: string }).user_id ?? (m as { display_name?: string }).display_name ?? 'User',
      is_pinned: false,
    }));
    setMessages(asChat);
    const nameMap: Record<string, string> = {};
    asChat.forEach((m) => { if (m.user_id) nameMap[m.user_id] = m.user_id; });
    setDisplayNamesByUserId((prev) => ({ ...prev, ...nameMap }));
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    const isSeedRoom = selectedRoomId.startsWith('seed-');
    if (isSeedRoom) {
      setMessages(getSeedChatMessagesByRoomId(selectedRoomId));
      return;
    }
    if (useApi) {
      fetchApiMessages(selectedRoomId).catch(() => setMessages([]));
      const interval = setInterval(() => fetchApiMessages(selectedRoomId).catch(() => {}), 4000);
      return () => clearInterval(interval);
    }
    const p = supabase.from('chat_messages').select('*').eq('room_id', selectedRoomId).order('created_at', { ascending: true }).then(({ data }) => {
      setMessages((data ?? []) as ChatMessage[]);
    });
    void Promise.resolve(p).catch(() => setMessages([]));
    const channel = supabase.channel(`room:${selectedRoomId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoomId}` }, (payload) => {
      setMessages((prev) => [...prev, payload.new as ChatMessage]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoomId, useApi, fetchApiMessages]);

  useEffect(() => {
    if (useApi || !selectedRoomId || selectedRoomId.startsWith('seed-') || messages.length === 0) return;
    const userIds = [...new Set(messages.map((m) => m.user_id))];
    if (userIds.length === 0) return;
    const p = supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((row: { user_id: string; display_name: string }) => {
          map[row.user_id] = row.display_name ?? 'User';
        });
        setDisplayNamesByUserId((prev) => ({ ...prev, ...map }));
      });
    void Promise.resolve(p).catch(() => {});
  }, [selectedRoomId, messages, useApi]);

  const getDisplayName = (m: ChatMessage): string => {
    if (m.is_anonymous) return ANONYMOUS_DISPLAY;
    return displayNamesByUserId[m.user_id] ?? (m as ChatMessage & { display_name?: string }).display_name ?? 'User';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    if (!selectedRoomId || !content.trim()) return;
    if (selectedRoomId.startsWith('seed-')) return;
    setSending(true);
    if (useApi) {
      try {
        await apiPostChatMessage(selectedRoomId, content.trim(), isAnonymous);
        setContent('');
        await fetchApiMessages(selectedRoomId);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setSending(false);
      }
      return;
    }
    let currentUser = user;
    if (!currentUser) {
      const result = await ensureAnonymousSession();
      currentUser = result.user;
      if (!currentUser) {
        const isLikelyAnonDisabled = result.error && /anonymous|disabled|422|sign.?in|unprocessable/i.test(result.error);
        const hint = isLikelyAnonDisabled
          ? 'Anonymous sign-in may be disabled. Enable it in Supabase: Dashboard → Authentication → Providers → Anonymous sign-ins. Also check Auth → Settings and ensure sign-ups are not disabled.'
          : (result.error || 'Unable to sign you in. Please try again.');
        setSendError(isLikelyAnonDisabled && result.error ? `${hint} (Error: ${result.error})` : hint);
        setSending(false);
        return;
      }
    }
    const { error } = await supabase.from('chat_messages').insert({
      room_id: selectedRoomId,
      user_id: currentUser.id,
      content: content.trim(),
      is_anonymous: isAnonymous,
    });
    setSending(false);
    if (error) {
      setSendError(error.message || 'Failed to send message');
      return;
    }
    setContent('');
  };

  const getPreviewMessages = (roomId: string): ChatMessage[] => {
    const msgs = roomId.startsWith('seed-') ? getSeedChatMessagesByRoomId(roomId) : [];
    return msgs.slice(-PREVIEW_MESSAGE_COUNT);
  };

  const getUnreadCount = (roomId: string): number => {
    if (roomId === SEED_CHAT_ROOM_IDS['General Discussion']) return 3;
    return 0;
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  if (roomsError) return <div className="community-chat-page"><h1>Community chat</h1><p className="error">{roomsError}</p></div>;
  if (useApi && rooms.length === 0) return <div className="community-chat-page"><h1>Community chat</h1><p className="loading">No chat rooms available.</p></div>;

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
                {!r.id.startsWith('seed-') && <span className="chat-room-meta"> · Community</span>}
                {unread > 0 && <span className="chat-room-unread">{unread}</span>}
                {preview.length > 0 && (
                  <div className="chat-room-preview">
                    {preview.map((m) => (
                      <div key={m.id} className="chat-room-preview-msg">
                        {getDisplayName(m)}: {m.content.slice(0, 40)}{m.content.length > 40 ? '…' : ''}
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
                    <span className="chat-msg-name">{getDisplayName(m)}</span>
                    <span className="chat-msg-content">{m.content}</span>
                    <span className="chat-msg-time">{formatRelativeTime(m.created_at)}</span>
                  </div>
                ))}
              </div>
              {selectedRoomId.startsWith('seed-') && !useApi ? (
                <div className="chat-signin-bar">Sign in to send messages in this room.</div>
              ) : (
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  {sendError && <p className="chat-send-error">{sendError}</p>}
                  <AnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} label="Send anonymously" />
                  <input type="text" placeholder="Type a message…" value={content} onChange={(e) => setContent(e.target.value)} disabled={sending} />
                  <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
