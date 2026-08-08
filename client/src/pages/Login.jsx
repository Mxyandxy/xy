import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '登录失败');
      setSubmitting(false);
    }
  };

  return (
    <div className="card form-card">
      <h1 className="form-title">登录</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>用户名</label>
          <input
            className="form-input"
            value={username}
            placeholder="请输入用户名"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>密码</label>
          <input
            className="form-input"
            type="password"
            value={password}
            placeholder="请输入密码"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
          {submitting ? '登录中...' : '登录'}
        </button>
      </form>
      <div className="form-footer">
        还没有账号？<Link to="/register">立即注册</Link>
      </div>
    </div>
  );
}
