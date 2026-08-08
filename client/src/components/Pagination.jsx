export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={`e${idx}`} className="page-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        下一页
      </button>
    </div>
  );
}
