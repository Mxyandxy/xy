import { useRef, useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Avatar from './Avatar';

// 带 @提及自动补全 + 图片上传的文本域
export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  minHeight = 120,
  allowImage = false,
}) {
  const textareaRef = useRef(null);
  const [mention, setMention] = useState(null); // { start, query }
  const [suggestions, setSuggestions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // 根据光标位置检测是否正在输入 @提及
  const detectMention = useCallback((text, cursorPos) => {
    const before = text.slice(0, cursorPos);
    const m = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(before);
    if (m) {
      return { start: cursorPos - m[0].length + 1, query: m[1] };
    }
    return null;
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    setMention(detectMention(e.target.value, e.target.selectionStart));
  };

  const handleKeyUp = (e) => {
    setMention(detectMention(e.target.value, e.target.selectionStart));
  };

  // 防抖获取用户建议
  useEffect(() => {
    if (!mention || !mention.query) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      client
        .get('/users/search', { params: { keyword: mention.query } })
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [mention]);

  const selectMention = (username) => {
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + mention.query.length + 1);
    const newText = `${before}@${username} ${after}`;
    onChange(newText);
    setMention(null);
    setSuggestions([]);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      const pos = before.length + username.length + 2;
      el.setSelectionRange(pos, pos);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await client.post('/upload', formData);
      const url = res.data.url;
      const el = textareaRef.current;
      const cursor = el ? el.selectionStart : value.length;
      const markdown = `![图片](${url})`;
      const newText = value.slice(0, cursor) + markdown + value.slice(cursor);
      onChange(newText);
      if (el) {
        el.focus();
        el.setSelectionRange(cursor + markdown.length, cursor + markdown.length);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="mention-textarea">
      <textarea
        ref={textareaRef}
        className="form-textarea"
        style={{ minHeight }}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        onBlur={() => setTimeout(() => { setMention(null); setSuggestions([]); }, 150)}
      />
      {mention && suggestions.length > 0 && (
        <div className="mention-dropdown">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              className="mention-option"
              onMouseDown={(e) => { e.preventDefault(); selectMention(u.username); }}
            >
              <Avatar user={u} size={22} />
              <span className="mention-nickname">{u.nickname}</span>
              <span className="mention-username">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
      {allowImage && (
        <div className="textarea-toolbar">
          <label className="btn btn-ghost btn-sm upload-btn">
            {uploading ? '上传中...' : '🖼️ 上传图片'}
            <input type="file" accept="image/*" hidden onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadError && <span className="upload-error">{uploadError}</span>}
        </div>
      )}
    </div>
  );
}
