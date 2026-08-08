import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Avatar from '../components/Avatar';
import Pagination from '../components/Pagination';
import { formatTime } from '../utils/format';

const TYPE_TEXT = {
  reply: '回复了你的帖子',
  mention: '在帖子中提到了你',
  like: '赞了你的帖子',
};

export default function Notifications() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  const fetchList = (p) => {
    client
      .get('/notifications', { params: { page: p, pageSize: 10 } })
      .then((res) => setData(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchList(page);
  }, [page]);

  const handleReadAll = async () => {
    try {
      await client.patch('/notifications/read-all');
      fetchList(page);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      // 忽略
    }
  };

  const handleRead = async (id) => {
    try {
      await client.patch(`/notifications/${id}/read`);
      setData((d) => ({
        ...d,
        items: d.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      }));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      // 忽略
    }
  };

  if (!data) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div className="toolbar">
        <h1 className="page-title" style={{ marginBottom: 0 }}>消息通知</h1>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={handleReadAll}>
          全部已读
        </button>
      </div>

      {data.items.length === 0 ? (
        <div className="empty">暂无通知</div>
      ) : (
        <div className="card">
          {data.items.map((n) => (
            <div key={n.id} className={`notification-item ${n.isRead ? '' : 'unread'}`}>
              <Avatar user={n.actor} size={36} />
              <div className="notification-body">
                <div className="notification-text">
                  <span className="notification-actor">{n.actor.nickname}</span>
                  {TYPE_TEXT[n.type] || '与你互动了'}
                  {n.postTitle && (
                    <Link to={`/post/${n.postId}`} onClick={() => handleRead(n.id)}>
                      《{n.postTitle}》
                    </Link>
                  )}
                </div>
                {n.content && <div className="notification-preview">{n.content}</div>}
                <div className="notification-time">{formatTime(n.createdAt)}</div>
              </div>
              {!n.isRead && <span className="notification-dot" />}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}
