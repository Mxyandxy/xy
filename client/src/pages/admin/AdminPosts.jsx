import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Pagination from '../../components/Pagination';
import { formatTime } from '../../utils/format';

export default function AdminPosts() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchPosts = (p, kw) => {
    client
      .get('/admin/posts', { params: { page: p, pageSize: 10, keyword: kw } })
      .then((res) => setData(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchPosts(page, search);
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(keyword);
  };

  const doAction = async (url, body, successMsg) => {
    try {
      await client.patch(url, body);
      fetchPosts(page, search);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除这个帖子吗？')) return;
    try {
      await client.delete(`/admin/posts/${id}`);
      fetchPosts(page, search);
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  if (!data) return <div className="loading">加载中...</div>;

  return (
    <div>
      <h1 className="page-title">帖子管理</h1>
      <form className="toolbar" onSubmit={handleSearch}>
        <input
          className="form-input"
          placeholder="搜索标题或内容..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">搜索</button>
      </form>
      {error && <div className="form-error">{error}</div>}

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>作者</th>
              <th>板块</th>
              <th>点赞/回复</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr><td colSpan="7" className="empty">暂无帖子</td></tr>
            ) : (
              data.items.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    <Link to={`/post/${p.id}`}>{p.title}</Link>
                    {p.isPinned && <span className="badge badge-pinned" style={{ marginLeft: 6 }}>置顶</span>}
                    {p.isFeatured && <span className="badge badge-featured" style={{ marginLeft: 4 }}>精华</span>}
                  </td>
                  <td>{p.author.nickname}</td>
                  <td>{p.board.name}</td>
                  <td>{p.likeCount} / {p.replyCount}</td>
                  <td>{formatTime(p.createdAt)}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => doAction(`/admin/posts/${p.id}/pin`, { isPinned: !p.isPinned })}
                      >
                        {p.isPinned ? '取消置顶' : '置顶'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => doAction(`/admin/posts/${p.id}/feature`, { isFeatured: !p.isFeatured })}
                      >
                        {p.isFeatured ? '取消加精' : '加精'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}
