import React, { useEffect, useRef, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AnonymousToggle } from '../AnonymousToggle';
import { formatRelativeTime } from '../../utils/formatDate';
import type { ChatMessage, ChatRoom } from '../../types/database';

interface ShelterChatTabProps {
  shelterId: string;
}

const ANONYMOUS_DISPLAY = 'Anonymous';

export function ShelterChatTab({ shelterId }: ShelterChatTabProps) {
  const { user, profile } = useAuth();
  const { withAuth } = useRequireAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setRoom(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data: roomData } = await supabase.from('chat_rooms').select('*').eq('shelter_id', shelterId).eq('type', 'shelter').maybeSingle();
      if (!mounted) return;
      if (roomData) {
        setRoom(roomData as ChatRoom);
        const { data: msgData } = await supabase.from('chat_messages').select('*').eq('room_id', roomData.id).order('created_at', { ascending: false }).limit(100);
        if (mounted) setMessages(((msgData ?? []) as ChatMessage[]).reverse());
      } else {
        const { data: newRoom } = await supabase.from('chat_rooms').insert({ shelter_id: shelterId, name: 'Shelter chat', type: 'shelter' }).select('*').single();
        if (mounted && newRoom) {
          setRoom(newRoom as ChatRoom);
          setMessages([]);
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [shelterId]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase.channel(`room:${room.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` }, (payload) => {
      setMessages((prev) => [...prev, payload.new as ChatMessage]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => withAuth(async () => {
    if (!user || !room || !content.trim()) return;
    setSending(true);
    await supabase.from('chat_messages').insert({ room_id: room.id, user_id: user.id, content: content.trim(), is_anonymous: isAnonymous });
    setContent('');
    setSending(false);
  });

  if (loading) return <p className="loading">Loading chat…</p>;
  if (!room) return <p className="error">Could not load chat</p>;

  return (
    <div className="shelter-chat-tab">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className="chat-msg">
            <span className="chat-msg-name">{m.is_anonymous ? ANONYMOUS_DISPLAY : (profile?.display_name ?? 'User')}</span>
            <span className="chat-msg-content">{m.content}</span>
            <span className="chat-msg-time">{formatRelativeTime(m.created_at)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {user && (
        <form className="chat-input-form" onSubmit={(e) => { e.preventDefault(); sendMessage()(); }}>
          <AnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} label="Send anonymously" />
          <div className="chat-input-row">
            <input type="text" placeholder="Type a message…" value={content} onChange={(e) => setContent(e.target.value)} disabled={sending} />
            <button type="submit" className="btn btn-primary" disabled={sending || !content.trim()}>Send</button>
          </div>
        </form>
      )}
    </div>
  );
}
