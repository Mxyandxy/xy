const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

let s3 = null;
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
    },
  });
}

const R2_BUCKET = process.env.R2_BUCKET || 'campus-forum-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

const USE_IMGBB = !s3 && !!IMGBB_API_KEY;

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const USE_LOCAL_DISK = !s3 && !USE_IMGBB;
if (USE_LOCAL_DISK && !fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.warn('[upload] 无法创建上传目录:', err.message);
  }
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const storage = (s3 || USE_IMGBB)
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => {
        const ext = EXT_MAP[file.mimetype] || '.png';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/gif/webp 图片'));
    }
  },
});

async function uploadToImgbb(buffer, mimetype) {
  const base64 = buffer.toString('base64');
  const formData = new URLSearchParams();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`ImgBB 上传失败: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(`ImgBB 上传失败: ${data.error?.message || '未知错误'}`);
  }

  return data.data.url;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 5MB' : (err.message || '上传失败');
    return res.status(400).json({ message });
  }

  if (!req.file) {
    return res.status(400).json({ message: '请选择图片' });
  }

  if (s3) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const ext = EXT_MAP[req.file.mimetype] || '.png';
    const key = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));
    const url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : `/uploads/${key}`;
    return res.status(201).json({ url });
  }

  if (USE_IMGBB) {
    try {
      const url = await uploadToImgbb(req.file.buffer, req.file.mimetype);
      return res.status(201).json({ url });
    } catch (err) {
      console.error('[upload] ImgBB 上传失败:', err.message);
      return res.status(500).json({ message: '图片上传失败' });
    }
  }

  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
