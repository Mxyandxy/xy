import { useEffect, useState } from 'react';
import client from '../../api/client';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import { formatTime } from '../../utils/format';

export default function AdminUsers() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = (p, kw) => {
    client
      .get('/admin/users', { params: { page: p, pageSize: 10, keyword: kw } })
      .then((res) => setData(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(keyword);
  };

  const handleBan = async (user) => {
    const next = user.status === 'banned' ? 'active' : 'banned';
    const action = next === 'banned' ? '封禁' : '解封';
    if (!window.confirm(`确定${action}用户「${user.nickname}」吗？`)) return;
    try {
      await client.patch(`/admin/users/${user.id}/ban`, { status: next });
      fetchUsers(page, search);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '操作失败');
    }
  };

  if (!data) return <div className="loading">加载中...</div>;

  return (
    <div>
      <h1 className="page-title">用户管理</h1>
      <form className="toolbar" onSubmit={handleSearch}>
        <input
          className="form-input"
          placeholder="搜索用户名或昵称..."
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
              <th>用户</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr><td colSpan="6" className="empty">暂无用户</td></tr>
            ) : (
              data.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar user={u} size={24} />
                      <span>{u.nickname}</span>
                      <span style={{ color: 'var(--text-light)', fontSize: 12 }}>@{u.username}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`tag ${u.role === 'admin' ? 'tag-admin' : 'tag-user'}`}>
                      {u.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td>
                    <span className={`tag ${u.status === 'banned' ? 'tag-banned' : 'tag-active'}`}>
                      {u.status === 'banned' ? '已封禁' : '正常'}
                    </span>
                  </td>
                  <td>{formatTime(u.createdAt)}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.status === 'banned' ? 'btn-ghost' : 'btn-danger'}`}
                      onClick={() => handleBan(u)}
                    >
                      {u.status === 'banned' ? '解封' : '封禁'}
                    </button>
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
