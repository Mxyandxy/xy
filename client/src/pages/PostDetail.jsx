import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import Avatar from '../components/Avatar';
import ReplyItem from '../components/ReplyItem';
import MentionTextarea from '../components/MentionTextarea';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/format';
import renderContent from '../utils/renderContent.jsx';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get(`/posts/${id}`)
      .then((res) => {
        setData(res.data);
        setLiked(res.data.likedByMe);
        setLikeCount(res.data.post.likeCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!data) return <div className="empty">帖子不存在</div>;

  const { post, replies } = data;
  const canDelete = user && (user.id === post.author.id || user.role === 'admin');

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await client.post(`/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      setError(err.response?.data?.message || '操作失败');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      const res = await client.post(`/posts/${post.id}/replies`, { content: replyText });
      setData((d) => ({ ...d, replies: [...d.replies, res.data.reply] }));
      setReplyText('');
      setError('');
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      setError(err.response?.data?.message || '回复失败');
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('确定删除这条回复吗？')) return;
    try {
      await client.delete(`/replies/${replyId}`);
      setData((d) => ({ ...d, replies: d.replies.filter((r) => r.id !== replyId) }));
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('确定删除这个帖子吗？')) return;
    try {
      await client.delete(`/posts/${post.id}`);
      navigate(`/board/${post.board.id}`);
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="post-detail-header">
          <div className="post-badges">
            {post.isPinned && <span className="badge badge-pinned">置顶</span>}
            {post.isFeatured && <span className="badge badge-featured">精华</span>}
          </div>
          <h1 className="post-detail-title">{post.title}</h1>
          <div className="post-detail-meta">
            <Avatar user={post.author} size={28} />
            <span>{post.author.nickname}</span>
            <span>·</span>
            <Link to={`/board/${post.board.id}`}>{post.board.name}</Link>
            <span>·</span>
            <span>{formatTime(post.createdAt)}</span>
          </div>
        </div>

        <div className="post-detail-content">{renderContent(post.content)}</div>

        <div className="post-actions">
          <button
            className={`btn btn-ghost like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          {canDelete && (
            <button className="btn btn-danger btn-sm" onClick={handleDeletePost}>删除帖子</button>
          )}
        </div>
      </div>

      <div className="card replies-section">
        <h2 className="replies-title">全部回复（{replies.length}）</h2>
        {replies.length === 0 ? (
          <div className="empty">还没有回复，来抢沙发！</div>
        ) : (
          replies.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              canDelete={user && (user.id === r.author.id || user.role === 'admin')}
              onDelete={handleDeleteReply}
            />
          ))
        )}

        {user ? (
          <form className="reply-form" onSubmit={handleReply}>
            {error && <div className="form-error">{error}</div>}
            <MentionTextarea
              value={replyText}
              onChange={setReplyText}
              placeholder="写下你的回复...（输入 @ 可提及用户）"
              minHeight={80}
              allowImage
            />
            <div style={{ marginTop: 10 }}>
              <button type="submit" className="btn btn-primary">发表回复</button>
            </div>
          </form>
        ) : (
          <div className="empty">
            <Link to="/login">登录</Link> 后参与讨论
          </div>
        )}
      </div>
    </div>
  );
}
