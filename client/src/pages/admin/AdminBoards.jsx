import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function AdminBoards() {
  const [boards, setBoards] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchBoards = () => {
    client.get('/boards').then((res) => setBoards(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSortOrder('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('板块名称不能为空');
      return;
    }
    try {
      if (editingId) {
        await client.patch(`/admin/boards/${editingId}`, { name, description, sortOrder: Number(sortOrder) || 0 });
      } else {
        await client.post('/admin/boards', { name, description, sortOrder: Number(sortOrder) || 0 });
      }
      resetForm();
      setError('');
      fetchBoards();
    } catch (err) {
      setError(err.response?.data?.message || '保存失败');
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setName(b.name);
    setDescription(b.description);
    setSortOrder(String(b.sortOrder));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除该板块吗？板块下的所有帖子将一并删除！')) return;
    try {
      await client.delete(`/admin/boards/${id}`);
      if (editingId === id) resetForm();
      fetchBoards();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  return (
    <div>
      <h1 className="page-title">板块管理</h1>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editingId ? '编辑板块' : '新增板块'}</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>名称</label>
            <input
              className="form-input"
              value={name}
              placeholder="板块名称"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <input
              className="form-input"
              value={description}
              placeholder="板块描述"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>排序（数字越小越靠前）</label>
            <input
              className="form-input"
              type="number"
              value={sortOrder}
              placeholder="0"
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? '保存修改' : '新增板块'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>取消</button>
            )}
          </div>
        </form>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>描述</th>
              <th>排序</th>
              <th>帖子数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {boards.length === 0 ? (
              <tr><td colSpan="6" className="empty">暂无板块</td></tr>
            ) : (
              boards.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.name}</td>
                  <td>{b.description}</td>
                  <td>{b.sortOrder}</td>
                  <td>{b.postCount}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(b)}>编辑</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
