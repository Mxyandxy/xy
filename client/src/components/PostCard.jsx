import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { formatTime } from '../utils/format';

export default function PostCard({ post }) {
  return (
    <div className="post-card">
      <div className="post-card-main">
        <div className="post-badges">
          {post.isPinned && <span className="badge badge-pinned">置顶</span>}
          {post.isFeatured && <span className="badge badge-featured">精华</span>}
        </div>
        <Link to={`/post/${post.id}`} className="post-title">{post.title}</Link>
        <div className="post-meta">
          <Avatar user={post.author} size={20} />
          <span className="post-author">{post.author.nickname}</span>
          {post.board && <span className="post-board">· {post.board.name}</span>}
          <span className="post-time">· {formatTime(post.createdAt)}</span>
        </div>
      </div>
      <div className="post-stats">
        <span>👍 {post.likeCount}</span>
        <span>💬 {post.replyCount}</span>
      </div>
    </div>
  );
}
