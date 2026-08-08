import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <NavLink to="/admin" end>📊 概览</NavLink>
        <NavLink to="/admin/posts">📝 帖子管理</NavLink>
        <NavLink to="/admin/users">👥 用户管理</NavLink>
        <NavLink to="/admin/boards">📁 板块管理</NavLink>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
