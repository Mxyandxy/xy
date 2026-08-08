import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register(username, password, nickname);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '注册失败');
      setSubmitting(false);
    }
  };

  return (
    <div className="card form-card">
      <h1 className="form-title">注册</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>用户名</label>
          <input
            className="form-input"
            value={username}
            placeholder="3-20 位字母、数字或下划线"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>昵称</label>
          <input
            className="form-input"
            value={nickname}
            placeholder="1-20 个字符"
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>密码</label>
          <input
            className="form-input"
            type="password"
            value={password}
            placeholder="至少 6 位"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
          {submitting ? '注册中...' : '注册'}
        </button>
      </form>
      <div className="form-footer">
        已有账号？<Link to="/login">去登录</Link>
      </div>
    </div>
  );
}
