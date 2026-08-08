import Avatar from './Avatar';
import { formatTime } from '../utils/format';
import renderContent from '../utils/renderContent.jsx';

export default function ReplyItem({ reply, canDelete, onDelete }) {
  return (
    <div className="reply-item">
      <Avatar user={reply.author} size={32} />
      <div className="reply-body">
        <div className="reply-header">
          <span className="reply-author">{reply.author.nickname}</span>
          <span className="reply-time">{formatTime(reply.createdAt)}</span>
          {canDelete && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(reply.id)}>删除</button>
          )}
        </div>
        <div className="reply-content">{renderContent(reply.content)}</div>
      </div>
    </div>
  );
}
