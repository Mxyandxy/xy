import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import PostCard from '../components/PostCard';

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [hotPosts, setHotPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/boards'),
      client.get('/posts', { params: { sort: 'hot', pageSize: 5 } }),
    ])
      .then(([boardsRes, postsRes]) => {
        setBoards(boardsRes.data);
        setHotPosts(postsRes.data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <h1 className="page-title">板块</h1>
      <div className="board-grid">
        {boards.map((b) => (
          <Link key={b.id} to={`/board/${b.id}`} className="board-card">
            <h3>{b.name}</h3>
            <p>{b.description}</p>
            <span className="board-count">{b.postCount} 个帖子</span>
          </Link>
        ))}
      </div>

      <h1 className="page-title">热门帖子</h1>
      {hotPosts.length === 0 ? (
        <div className="empty">暂无帖子，快来发第一帖吧！</div>
      ) : (
        hotPosts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
