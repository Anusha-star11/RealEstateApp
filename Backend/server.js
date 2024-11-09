import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer'; // Import multer for file handling
import slideRoutes from './Routes/slides.route.js'; 
import projectRoutes from './Routes/project.route.js';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// MongoDB Connection
mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("MongoDB is connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

const allowedOrigins = [
  'http://localhost:5173',
  'https://v9-properties.onrender.com'
];

const app = express();

// Basic middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// CSP middleware - MOVED TO TOP before static files and routes
// app.use((req, res, next) => {
//   res.setHeader(
//     'Content-Security-Policy',
//     [
//       "default-src 'self'",
//       "font-src 'self' data: https: https://fonts.gstatic.com https://ka-f.fontawesome.com",
//       "img-src 'self' data: blob: https:",
//       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://ka-f.fontawesome.com",
//       "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ka-f.fontawesome.com",
//       "connect-src 'self' https://v9-properties.onrender.com wss://v9-properties.onrender.com ws://localhost:* https://ka-f.fontawesome.com",
//       "manifest-src 'self'",
//       "base-uri 'self'",
//       "form-action 'self'"
//     ].join('; ')
//   );
//   next();
// });

// // Static file serving with correct MIME types
// // Update your static file serving configuration
// app.use(express.static(path.join(__dirname, '../RealEstate/dist'), {
//   setHeaders: (res, filePath) => {
//     if (filePath.endsWith('.js')) {
//       res.setHeader('Content-Type', 'application/javascript');
//     } else if (filePath.endsWith('.css')) {
//       res.setHeader('Content-Type', 'text/css');
//     } else if (filePath.endsWith('.html')) {
//       res.setHeader('Content-Type', 'text/html');
//     } else if (filePath.endsWith('.woff2')) {
//       res.setHeader('Content-Type', 'font/woff2');
//     } else if (filePath.endsWith('.woff')) {
//       res.setHeader('Content-Type', 'font/woff');
//     }
//   }
// }));
app.use(express.static(path.join(__dirname, 'Realestate', 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

// API Routes
app.use("/api", slideRoutes);
app.use("/api", projectRoutes);

// Upload route
app.post('/api/upload', upload.single('backgroundImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname,'../RealEstate/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size is too large. Max size is 15MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Something broke!' });
});

// Start Server
app.listen(5001, () => {
  console.log("Server is running on port 5001!");
});