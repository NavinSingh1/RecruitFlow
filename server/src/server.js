require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set. Copy .env.example to .env');
connectDB(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log(`API running on :${process.env.PORT || 5000}`)))
  .catch((e) => { console.error('DB connection failed', e.message); process.exit(1); });
