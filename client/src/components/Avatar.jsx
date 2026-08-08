export default function Avatar({ user, size = 36 }) {
  const color = user?.avatarColor || '#4A90D9';
  const text = (user?.nickname || user?.username || '?').charAt(0).toUpperCase();
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.45 }}
      title={user?.nickname || user?.username}
    >
      {text}
    </div>
  );
}
