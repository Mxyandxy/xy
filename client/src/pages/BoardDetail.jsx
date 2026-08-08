import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function BoardDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [posts, setPosts] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client
      .get(`/boards/${id}`, { params: { page, pageSize: 10 } })
      .then((res) => {
        setBoard(res.data.board);
        setPosts(res.data.posts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, page]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!board) return <div className="empty">板块不存在</div>;

  return (
    <div>
      <div className="card">
        <h1 className="page-title" style={{ marginBottom: 4 }}>{board.name}</h1>
        <p style={{ color: 'var(--text-light)', fontSize: 14 }}>{board.description}</p>
      </div>

      <div className="toolbar">
        <span style={{ color: 'var(--text-light)', fontSize: 14 }}>
          共 {posts.total} 个帖子
        </span>
        {user && (
          <Link to="/post/new" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            ✏️ 发帖
          </Link>
        )}
      </div>

      {posts.items.length === 0 ? (
        <div className="empty">这个板块还没有帖子</div>
      ) : (
        posts.items.map((p) => <PostCard key={p.id} post={p} />)
      )}

      <Pagination page={page} totalPages={posts.totalPages} onChange={setPage} />
    </div>
  );
}
