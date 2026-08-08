import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    client
      .get('/posts', { params: { keyword: q, page: 1, pageSize: 10 } })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    if (page === 1) return;
    client
      .get('/posts', { params: { keyword: q, page, pageSize: 10 } })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [page, q]);

  if (loading) return <div className="loading">搜索中...</div>;

  return (
    <div>
      <h1 className="page-title">搜索「{q}」</h1>
      {!data || data.items.length === 0 ? (
        <div className="empty">没有找到相关帖子</div>
      ) : (
        <>
          <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 12 }}>
            共找到 {data.total} 个结果
          </p>
          {data.items.map((p) => <PostCard key={p.id} post={p} />)}
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
