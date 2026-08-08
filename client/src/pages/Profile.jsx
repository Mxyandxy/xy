import { useEffect, useState } from 'react';
import client from '../api/client';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/format';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    client
      .get('/posts', { params: { userId: user.id, pageSize: 20 } })
      .then((res) => setPosts(res.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      setError('昵称不能为空');
      return;
    }
    try {
      const res = await client.patch('/auth/me', { nickname });
      updateUser(res.data.user);
      setEditing(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '保存失败');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="profile-header">
          <Avatar user={user} size={64} />
          <div className="profile-info">
            {editing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ maxWidth: 200 }}
                  value={nickname}
                  maxLength={20}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={handleSaveNickname}>保存</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>取消</button>
              </div>
            ) : (
              <h2>
                {user.nickname}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 10 }}
                  onClick={() => { setNickname(user.nickname); setEditing(true); }}
                >
                  修改昵称
                </button>
              </h2>
            )}
            {error && <div className="form-error" style={{ textAlign: 'left' }}>{error}</div>}
            <p>@{user.username} · 注册于 {formatDateTime(user.createdAt)}</p>
            <div className="profile-stats">
              <span>发帖 <b>{posts.length}</b></span>
              {user.role === 'admin' && <span className="tag tag-admin">管理员</span>}
            </div>
          </div>
        </div>
      </div>

      <h1 className="page-title">我的帖子</h1>
      {loading ? (
        <div className="loading">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="empty">还没有发过帖子</div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
