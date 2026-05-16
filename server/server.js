require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();

const startDB = async (retries = 5) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await connectDB();
      return;
    } catch (err) {
      console.error(`DB connection attempt ${i}/${retries} failed:`, err.message);
      if (i === retries) { process.exit(1); }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};
startDB();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'enterprise-insurance-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance',
    ttl: 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Auth
app.use('/api/auth', require('./routes/auth'));

// Product catalog (multi-role read, payer_admin write)
app.use('/api/products',   require('./routes/products'));
app.use('/api/coverages',  require('./routes/coverages'));
app.use('/api/tiers',      require('./routes/tiers'));

// Core insurance workflows
app.use('/api/quotes',      require('./routes/quotes'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/claims',      require('./routes/claims'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/agreements',  require('./routes/agreements'));

// Analytics
app.use('/api/reports', require('./routes/reports'));

// Super admin entity management
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
