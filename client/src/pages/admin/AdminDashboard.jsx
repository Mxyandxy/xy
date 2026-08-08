import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    client.get('/admin/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="loading">加载中...</div>;

  const cards = [
    { label: '用户总数', value: stats.userCount },
    { label: '帖子总数', value: stats.postCount },
    { label: '回复总数', value: stats.replyCount },
    { label: '板块总数', value: stats.boardCount },
  ];

  return (
    <div>
      <h1 className="page-title">管理概览</h1>
      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="stat-num">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
