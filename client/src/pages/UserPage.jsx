import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { formatDateTime } from '../utils/format';

export default function UserPage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [postCount, setPostCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client
      .get(`/users/${username}`)
      .then((userRes) => {
        setUser(userRes.data.user);
        setPostCount(userRes.data.postCount);
        return client.get('/posts', { params: { userId: userRes.data.user.id, pageSize: 20 } });
      })
      .then((postsRes) => setPosts(postsRes.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!user) return <div className="empty">用户不存在</div>;

  return (
    <div>
      <div className="card">
        <div className="profile-header">
          <Avatar user={user} size={64} />
          <div className="profile-info">
            <h2>{user.nickname}</h2>
            <p>@{user.username} · 注册于 {formatDateTime(user.createdAt)}</p>
            <div className="profile-stats">
              <span>发帖 <b>{postCount}</b></span>
              {user.role === 'admin' && <span className="tag tag-admin">管理员</span>}
            </div>
          </div>
        </div>
      </div>

      <h1 className="page-title">TA 的帖子</h1>
      {posts.length === 0 ? (
        <div className="empty">还没有发过帖子</div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
