import { Link } from 'react-router-dom';

// 把内容渲染为 React 节点：![alt](url) → <img>，@username → <Link>，其余按文本
// 纯文本由 React 自动转义，无 XSS 风险
const TOKEN_RE = /!\[([^\]]*)\]\(([^)\s]+)\)|@([a-zA-Z0-9_]{3,20})/g;

export default function renderContent(content) {
  if (!content) return null;

  const nodes = [];
  let lastIndex = 0;
  let key = 0;
  let m;
  TOKEN_RE.lastIndex = 0;

  while ((m = TOKEN_RE.exec(content)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(content.slice(lastIndex, m.index));
    }
    if (m[1] !== undefined) {
      // 图片 ![alt](url)
      nodes.push(<img key={key++} src={m[2]} alt={m[1] || '图片'} className="content-image" />);
    } else if (m[3] !== undefined) {
      // @提及
      nodes.push(
        <Link key={key++} to={`/user/${m[3]}`} className="content-mention">@{m[3]}</Link>
      );
    }
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}
