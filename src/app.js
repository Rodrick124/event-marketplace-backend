const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');
const reservationRoutes = require('./routes/reservation.routes');
const paymentRoutes = require('./routes/payment.routes');
const contactRoutes = require('./routes/contact.routes');
const cartRoutes = require('./routes/cart.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// General rate limiter for most requests
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 300,
	standardHeaders: true,
	legacyHeaders: false,
});

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, // Limit each IP to 20 login/register/reset requests per window
	message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Rate limiter for the contact form to prevent spam
const contactLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 10, // Limit each IP to 10 submissions per hour
	message: 'You have submitted too many messages. Please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
});

app.get('/api/health', (req, res) => {
	return res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/users', globalLimiter, userRoutes);
app.use('/api/events', globalLimiter, eventRoutes);
app.use('/api/reservations', globalLimiter, reservationRoutes);
app.use('/api/payments', globalLimiter, paymentRoutes);
app.use('/api/cart', globalLimiter, cartRoutes);
app.use('/api/dashboard', globalLimiter, dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
