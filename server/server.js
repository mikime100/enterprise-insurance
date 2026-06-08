require('dotenv').config();
const express = require('express');
const path    = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

async function start() {
  // Connect DB first — everything depends on it
  for (let i = 1; i <= 5; i++) {
    try {
      await connectDB();
      break;
    } catch (err) {
      console.error(`DB attempt ${i}/5:`, err.message);
      if (i === 5) process.exit(1);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const app = express();

  // Trust Render/Cloudflare reverse proxy so req.secure = true and Secure cookies work
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(morgan('dev'));
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || origin === allowedOrigin || (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'enterprise-insurance-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance',
      ttl: 24 * 60 * 60,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  }));

  app.use('/api/auth',        require('./routes/auth'));
  app.use('/api/products',    require('./routes/products'));
  app.use('/api/coverages',   require('./routes/coverages'));
  app.use('/api/tiers',       require('./routes/tiers'));
  app.use('/api/quotes',      require('./routes/quotes'));
  app.use('/api/enrollments', require('./routes/enrollments'));
  app.use('/api/claims',      require('./routes/claims'));
  app.use('/api/payments',    require('./routes/payments'));
  app.use('/api/agreements',  require('./routes/agreements'));
  app.use('/api/reports',     require('./routes/reports'));
  app.use('/api/admin',       require('./routes/admin'));
  app.use('/api/broker',      require('./routes/broker'));
  app.use('/api/institution', require('./routes/institution'));
  app.use('/api/chapa',             require('./routes/chapa'));
  app.use('/api/policy-agreements', require('./routes/policyAgreements'));
  app.use('/api/upload',            require('./routes/upload'));
  app.use('/api/endorsements',      require('./routes/endorsements'));

  // Start renewal cron (daily 08:00 + startup check after 30s)
  const { startRenewalCron } = require('./utils/renewalCron');
  startRenewalCron();

  app.get('/api/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState }));

  app.post('/api/seed-init', async (req, res) => {
    try {
      const { secret, force } = req.body;
      if (force && secret !== (process.env.SESSION_SECRET || ''))
        return res.status(403).json({ message: 'Forbidden' });
      const User = require('./models/User');
      const count = await User.countDocuments();
      if (count > 0 && !force) return res.json({ message: 'Already seeded', userCount: count });
      const { spawn } = require('child_process');
      spawn('node', ['seeds/seed.js'], { cwd: __dirname, stdio: 'inherit', env: process.env })
        .on('exit', code => console.log(`Seed done (exit ${code})`));
      res.json({ message: force ? 'Force-reseeding started — wait 90s then refresh' : 'Seeding started — wait 60s' });
    } catch (err) { res.status(500).json({ message: err.message }); }
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Auto-seed if DB is empty
    try {
      const User = require('./models/User');
      const count = await User.countDocuments();
      if (count === 0) {
        console.log('Empty DB — seeding...');
        const { spawn } = require('child_process');
        spawn('node', ['seeds/seed.js'], { cwd: __dirname, stdio: 'inherit', env: process.env })
          .on('exit', code => console.log(`Seed done (exit ${code})`));
      } else {
        console.log(`DB has ${count} users`);
      }
    } catch (e) { console.error('Seed check failed:', e.message); }
  });
}

start();
