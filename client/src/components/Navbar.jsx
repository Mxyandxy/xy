import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [boards, setBoards] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    client.get('/boards').then((res) => setBoards(res.data)).catch(() => {});
  }, []);

  // 未读通知数：登录后获取，路由变化或收到通知更新事件时刷新
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    const fetchUnread = () => {
      client.get('/notifications/unread-count').then((res) => setUnread(res.data.count)).catch(() => {});
    };
    fetchUnread();
    window.addEventListener('notifications-updated', fetchUnread);
    return () => window.removeEventListener('notifications-updated', fetchUnread);
  }, [user, location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">🏫 校园论坛</Link>
        <nav className="nav-links">
          {boards.map((b) => (
            <Link key={b.id} to={`/board/${b.id}`} className="nav-link">{b.name}</Link>
          ))}
        </nav>
        <form className="search-box" onSubmit={handleSearch}>
          <input
            className="search-input"
            placeholder="搜索帖子..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button type="submit" className="search-btn">🔍</button>
        </form>
        <div className="nav-right">
          {user ? (
            <>
              <Link to="/notifications" className="bell" title="消息通知">
                🔔
                {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
              </Link>
              <div className="user-menu" onMouseLeave={() => setMenuOpen(false)}>
                <button className="user-trigger" onClick={() => setMenuOpen((v) => !v)}>
                  <Avatar user={user} size={30} />
                  <span>{user.nickname}</span>
                  <span className="caret">▾</span>
                </button>
                {menuOpen && (
                  <div className="dropdown">
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>个人中心</Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)}>管理后台</Link>
                    )}
                    <button onClick={handleLogout}>退出登录</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-ghost">登录</Link>
              <Link to="/register" className="btn btn-primary">注册</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
