## Event Marketplace Backend (Node.js + Express + MongoDB)

### Overview
Backend API for an Event Marketplace with three roles: Admin, Organizer, and Attendee. Supports authentication, role-based access control, event management, reservations and ticketing, payments (Stripe/PayPal/local), dashboards, and email notifications.

### Tech Stack
- **Runtime**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Auth**: JWT, bcrypt
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Payments**: Stripe, PayPal (server SDK), Local
- **Email**: Nodemailer (SMTP)

### Features
- **Authentication & RBAC**: JWT auth, middleware-enforced roles (admin/organizer/attendee)
- **Events**: Create, update, delete, approve; search and browse approved events
- **Reservations**: Atomic seat holds, cancelation, organizer/admin event reservation listing
- **Payments**: Checkout + verification with Stripe/PayPal, simple local method
- **Dashboards**: Aggregated stats for admin, organizer, attendee
- **Notifications**: Registration and booking confirmation emails with QR codes

## Project Structure
```text
src/
  app.js                     # Express app, middleware, and route mounting
  server.js                  # HTTP server bootstrap
  config/
    db.js                    # Mongo connection
    env.example              # Environment variables template
  controllers/               # Route handlers
    auth.controller.js
    user.controller.js
    event.controller.js
    reservation.controller.js
    payment.controller.js
    dashboard.controller.js
  middleware/
    auth.js                  # JWT auth + RBAC
    error.js                 # 404 + centralized error handler
  models/
    User.js
    Event.js
    Reservation.js
    Payment.js
  routes/
    auth.routes.js
    user.routes.js
    event.routes.js
    reservation.routes.js
    payment.routes.js
    dashboard.routes.js
  services/
    email.service.js         # SMTP + QR code utilities

scripts/
  seedAdmin.js               # Create an admin user
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB URI)

### Environment Variables
Copy the example file and fill in values as needed:
```bash
cp src/config/env.example .env
```

Key variables:
- `PORT` (default 5000)
- `MONGODB_URI` (e.g., mongodb://127.0.0.1:27017/event_marketplace)
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`
- `STRIPE_SECRET_KEY`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### Install & Run
```bash
npm install

# seed an admin user (prints credentials)
npm run seed:admin

# start in dev mode (nodemon)
npm run dev

# or start normally
npm start
```

Once running, check health:
```bash
curl http://localhost:5000/api/health
```

## Authentication
- Register and login to receive a JWT. Include it in the `Authorization` header as `Bearer <token>`.

Examples:
```bash
# Register (default role: attendee)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"Secret123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Secret123"}'

# Get current user
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer <JWT>"
```

## API Endpoints (Summary)

### Auth `/api/auth`
- `POST /register` Register (attendee by default)
- `POST /login` Login and receive JWT

### Users `/api/users`
- `GET /` Admin only: list all users
- `PATCH /:id/status` Admin only: suspend/activate
- `PATCH /me` Update own profile
- `GET /me` Get own profile

### Events `/api/events`
- `POST /` Organizer/Admin: create
- `GET /` Public: list approved events
- `GET /:id` Public: event details
- `PATCH /:id` Organizer/Admin: update
- `DELETE /:id` Organizer/Admin: delete
- `PATCH /:id/status` Admin: approve/reject
- `GET /search?query&category&date&location` Public: search/filter

### Reservations `/api/reservations`
- `POST /` Attendee: reserve tickets
- `GET /me` Attendee: own reservations
- `DELETE /:id` Attendee: cancel reservation
- `GET /event/:eventId` Organizer/Admin: reservations for an event

### Payments `/api/payments`
- `POST /checkout` Start payment: `{ reservationId, method: 'stripe'|'paypal'|'local' }`
- `POST /verify` Verify or mark payment: `{ paymentId, status }`
- `GET /me` My payment history

### Dashboards `/api/dashboard`
- `GET /admin` Admin stats
- `GET /organizer` Organizer stats
- `GET /organizer/events` Organizer: list own events with stats
- `GET /organizer/reservations` Organizer: list reservations for own events
- `GET /attendee` Attendee stats
- `GET /admin/users` Admin: list users with stats
- `GET /admin/events` Admin: list events with stats
- `GET /admin/reservations` Admin: list reservations with details
- `GET /admin/analytics/revenue` Admin: time-series revenue data
- `GET /admin/analytics/users` Admin: time-series user growth data
- `GET /admin/activity-logs` Admin: list system activity logs

## Reservation & Payment Flow
1. Attendee creates a reservation: seats are decremented atomically when available.
2. Attendee initiates checkout (`/api/payments/checkout`).
   - Stripe: returns `clientSecret` for client confirmation.
   - PayPal: returns `orderId`.
   - Local: returns `paymentId`.
3. Client verifies payment via `/api/payments/verify` to mark as completed and associates it with the reservation.
4. Confirmation email with QR code is sent (if SMTP configured).

## Security
- Helmet, CORS, and rate limiting are enabled in `src/app.js`.
- Inputs validated via `express-validator` per route.
- RBAC enforced via middleware in `src/middleware/auth.js`.

## Notes & Tips
- For Stripe, set `STRIPE_SECRET_KEY`.
- For PayPal, set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (Sandbox by default).
- Emails require SMTP credentials; see `src/services/email.service.js`.
- Admin approval is required to publish events (status `approved`).

## Scripts
```json
{
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "seed:admin": "node scripts/seedAdmin.js"
}
```

## Extending
- Add more categories or metadata to `Event` in `src/models/Event.js`.
- Add webhooks for Stripe/PayPal to automatically verify payments.
- Add pagination and sorting to more listings.

## License
MIT or as specified by your project needs.
