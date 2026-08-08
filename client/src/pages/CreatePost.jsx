import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import MentionTextarea from '../components/MentionTextarea';

export default function CreatePost() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.get('/boards').then((res) => {
      setBoards(res.data);
      if (res.data.length > 0) setBoardId(String(res.data[0].id));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!boardId || !title.trim() || !content.trim()) {
      setError('请填写板块、标题和内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await client.post('/posts', { boardId: Number(boardId), title, content });
      navigate(`/post/${res.data.post.id}`);
    } catch (err) {
      setError(err.response?.data?.message || '发帖失败');
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 className="page-title">发布新帖</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>板块</label>
          <select className="form-select" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>标题</label>
          <input
            className="form-input"
            value={title}
            maxLength={100}
            placeholder="请输入标题（最多 100 字）"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>内容</label>
          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder="请输入内容...（输入 @ 可提及用户）"
            minHeight={160}
            allowImage
          />
        </div>
        <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
          {submitting ? '发布中...' : '发布'}
        </button>
      </form>
    </div>
  );
}
