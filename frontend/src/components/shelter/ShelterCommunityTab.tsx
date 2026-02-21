import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AnonymousToggle } from '../AnonymousToggle';
import { formatRelativeTime } from '../../utils/formatDate';
import type { CommunityPost, Comment } from '../../types/database';
import type { PostType } from '../../types/database';

interface ShelterCommunityTabProps {
  shelterId: string;
}

const ANONYMOUS_DISPLAY = 'Anonymous Community Member';

export function ShelterCommunityTab({ shelterId }: ShelterCommunityTabProps) {
  const { user, profile } = useAuth();
  const { withAuth, requireAuthModal, openSignIn } = useRequireAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [commentAnonymous, setCommentAnonymous] = useState<Record<string, boolean>>({});

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('shelter_id', shelterId)
      .order('created_at', { ascending: false });
    setPosts((data ?? []) as CommunityPost[]);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchPosts();
      if (!mounted) return;
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [shelterId]);

  useEffect(() => {
    if (expandedPostId && !commentsByPost[expandedPostId]) {
      supabase.from('comments').select('*').eq('post_id', expandedPostId).order('created_at').then(({ data }) => {
        setCommentsByPost((prev) => ({ ...prev, [expandedPostId]: (data ?? []) as Comment[] }));
      });
    }
  }, [expandedPostId, commentsByPost]);

  const handleSubmitPost = withAuth(async () => {
    if (!user || !content.trim()) return;
    setSubmitting(true);
    await supabase.from('community_posts').insert({
      shelter_id: shelterId,
      user_id: user.id,
      content: content.trim(),
      is_anonymous: isAnonymous,
      post_type: postType,
    });
    setContent('');
    setIsAnonymous(false);
    await fetchPosts();
    setSubmitting(false);
  });

  const handleSubmitComment = (postId: string) => () => withAuth(async () => {
    if (!user) return;
    const text = commentContent[postId]?.trim();
    if (!text) return;
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: text, is_anonymous: commentAnonymous[postId] ?? false });
    setCommentContent((prev) => ({ ...prev, [postId]: '' }));
    setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at');
    setCommentsByPost((prev) => ({ ...prev, [postId]: (data ?? []) as Comment[] }));
  });

  const postTypeLabel = { general: 'General', question: 'Question', tip: 'Tip' };
  const postTypeClass = { general: 'type-general', question: 'type-question', tip: 'type-tip' };

  return (
    <div className="shelter-community-tab">
      {requireAuthModal}
      {user ? (
        <form className="community-post-form" onSubmit={(e) => { e.preventDefault(); handleSubmitPost(); }}>
          <AnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} />
          <select value={postType} onChange={(e) => setPostType(e.target.value as PostType)}>
            <option value="general">General</option>
            <option value="question">Question</option>
            <option value="tip">Tip</option>
          </select>
          <textarea placeholder="What would you like to share?" value={content} onChange={(e) => setContent(e.target.value)} required rows={3} />
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Posting…' : 'Post'}</button>
        </form>
      ) : (
        <button type="button" className="btn btn-primary" onClick={openSignIn}>Sign in to post</button>
      )}
      {loading && <p className="loading">Loading…</p>}
      <ul className="community-posts-list">
        {posts.map((p) => (
          <li key={p.id} className="community-post-item">
            <div className={`post-type-tag ${postTypeClass[p.post_type]}`}>{postTypeLabel[p.post_type]}</div>
            <p className="post-content">{p.content}</p>
            <p className="post-meta">{p.is_anonymous ? ANONYMOUS_DISPLAY : '—'} · {formatRelativeTime(p.created_at)}</p>
            <button type="button" className="link-button" onClick={() => setExpandedPostId(expandedPostId === p.id ? null : p.id)}>
              {(commentsByPost[p.id]?.length ?? 0)} comments
            </button>
            {expandedPostId === p.id && (
              <div className="comments-block">
                {(commentsByPost[p.id] ?? []).map((c) => (
                  <div key={c.id} className="comment">
                    <p>{c.content}</p>
                    <p className="comment-meta">{c.is_anonymous ? ANONYMOUS_DISPLAY : '—'} · {formatRelativeTime(c.created_at)}</p>
                  </div>
                ))}
                {user ? (
                  <div className="comment-form">
                    <AnonymousToggle checked={commentAnonymous[p.id] ?? false} onChange={(v) => setCommentAnonymous((prev) => ({ ...prev, [p.id]: v }))} />
                    <textarea placeholder="Add a comment" value={commentContent[p.id] ?? ''} onChange={(e) => setCommentContent((prev) => ({ ...prev, [p.id]: e.target.value }))} rows={2} />
                    <button type="button" className="btn btn-primary" onClick={() => handleSubmitComment(p.id)()()}>Comment</button>
                  </div>
                ) : (
                  <button type="button" className="link-button" onClick={openSignIn}>Sign in to comment</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {posts.length === 0 && !loading && <p className="empty">No posts yet.</p>}
    </div>
  );
}
