# API Endpoints Documentation

This document outlines the API endpoints for the Event Marketplace Backend, including their descriptions, authentication requirements, request formats, and example responses.

---

## Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`

*   **Description:** Registers a new user.
*   **Authentication:** None
*   **Request Body:**
    ```json
    {
        "name": "string",
        "email": "string (email format)",
        "password": "string (min 6 characters)",
        "role": "string (optional, 'admin', 'organizer', or 'attendee')"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
        "message": "User registered successfully",
        "user": {
            "_id": "string",
            "name": "string",
            "email": "string",
            "role": "string",
            "status": "active"
        },
        "token": "string (JWT)"
    }
    ```
*   **Response (Error 400):**
    ```json
    {
        "message": "Validation error or user already exists"
    }
    ```

### `POST /api/auth/login`

*   **Description:** Logs in a user.
*   **Authentication:** None
*   **Request Body:**
    ```json
    {
        "email": "string (email format)",
        "password": "string"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Logged in successfully",
        "user": {
            "_id": "string",
            "name": "string",
            "email": "string",
            "role": "string",
            "status": "active"
        },
        "token": "string (JWT)"
    }
    ```
*   **Response (Error 400/401):**
    ```json
    {
        "message": "Invalid credentials"
    }
    ```

### `GET /api/auth/me`

*   **Description:** Retrieves the currently authenticated user's profile.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "_id": "string",
        "name": "string",
        "email": "string",
        "role": "string",
        "status": "active"
    }
    ```
*   **Response (Error 401):**
    ```json
    {
        "message": "Unauthorized"
    }
    ```

### `POST /api/auth/logout`

*   **Description:** Logs out the current user (invalidates the token on the server side, if applicable, or simply provides a success message for client-side token removal).
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Logged out successfully"
    }
    ```
*   **Response (Error 401):**
    ```json
    {
        "message": "Unauthorized"
    }
    ```

---

## Dashboard Endpoints (`/api/dashboard`)

### `GET /api/dashboard/admin`

*   **Description:** Retrieves statistics for the admin dashboard.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "totalUsers": 100,
        "totalEvents": 50,
        "revenue": 15000.00,
        "bookings": 200
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized"
    }
    ```
    or
    ```json
    {
        "message": "Forbidden"
    }
    ```

### `GET /api/dashboard/organizer`

*   **Description:** Retrieves statistics for the organizer dashboard.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "events": 10,
        "revenue": 5000.00,
        "ticketsSold": 100,
        "performance": [
            {
                "_id": "eventId1",
                "revenue": 2000,
                "count": 40
            },
            {
                "_id": "eventId2",
                "revenue": 3000,
                "count": 60
            }
        ]
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized"
    }
    ```
    or
    ```json
    {
        "message": "Forbidden"
    }
    ```

### `GET /api/dashboard/attendee`

*   **Description:** Retrieves statistics for the attendee dashboard.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "upcoming": [
            {
                "_id": "reservationId1",
                "eventId": {
                    "_id": "eventId1",
                    "name": "Upcoming Event"
                }
            }
        ],
        "past": [
            {
                "_id": "reservationId2",
                "eventId": {
                    "_id": "eventId2",
                    "name": "Past Event"
                }
            }
        ],
        "spending": 250.00
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized"
    }
    ```
    or
    ```json
    {
        "message": "Forbidden"
    }
    ```

---

## Event Endpoints (`/api/events`)

### `POST /api/events`

*   **Description:** Creates a new event.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`, `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "title": "string (min 3 characters)",
        "description": "string (min 10 characters)",
        "category": "string ('Music', 'Tech', 'Education', 'Sports', 'Art', 'Other')",
        "location": {
            "address": "string",
            "city": "string",
            "state": "string",
            "zip": "string",
            "country": "string"
        },
        "date": "string (ISO 8601 format, e.g., '2025-12-31T18:00:00Z')",
        "time": "string (e.g., '18:00')",
        "price": "number (float, min 0)",
        "totalSeats": "number (integer, min 0)"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
        "_id": "string",
        "title": "string",
        "description": "string",
        "category": "string",
        "location": {},
        "date": "string",
        "time": "string",
        "price": 0,
        "totalSeats": 0,
        "organizerId": "string",
        "status": "pending"
    }
    ```
*   **Response (Error 400/401/403):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `GET /api/events`

*   **Description:** Lists all approved events.
*   **Authentication:** None
*   **Response (Success 200):**
    ```json
    [
        {
            "_id": "string",
            "title": "string",
            "description": "string",
            "category": "string",
            "location": {},
            "date": "string",
            "time": "string",
            "price": 0,
            "totalSeats": 0,
            "organizerId": "string",
            "status": "approved"
        }
    ]
    ```
*   **Response (Error 500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `GET /api/events/search`

*   **Description:** Searches for events by category.
*   **Authentication:** None
*   **Query Parameters:**
    *   `category`: `string` (optional, e.g., 'Music')
*   **Response (Success 200):**
    ```json
    [
        {
            "_id": "string",
            "title": "string",
            "description": "string",
            "category": "string",
            "location": {},
            "date": "string",
            "time": "string",
            "price": 0,
            "totalSeats": 0,
            "organizerId": "string",
            "status": "approved"
        }
    ]
    ```
*   **Response (Error 500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `GET /api/events/:id`

*   **Description:** Retrieves a single event by its ID.
*   **Authentication:** None
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Response (Success 200):**
    ```json
    {
        "_id": "string",
        "title": "string",
        "description": "string",
        "category": "string",
        "location": {},
        "date": "string",
        "time": "string",
        "price": 0,
        "totalSeats": 0,
        "organizerId": "string",
        "status": "approved"
    }
    ```
*   **Response (Error 404/500):**
    ```json
    {
        "message": "Event not found"
    }
    ```

### `PATCH /api/events/:id`

*   **Description:** Updates an existing event.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`, `admin`
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:** (Partial update, any of the fields from POST /api/events)
    ```json
    {
        "title": "string (min 3 characters)",
        "description": "string (min 10 characters)"
        // ... other fields
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Event updated successfully",
        "event": {
            "_id": "string",
            "title": "string",
            "description": "string"
            // ... updated fields
        }
    }
    ```
*   **Response (Error 400/401/403/404):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `DELETE /api/events/:id`

*   **Description:** Deletes an event.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`, `admin`
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Event deleted successfully"
    }
    ```
*   **Response (Error 401/403/404):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `PATCH /api/events/:id/status`

*   **Description:** Updates the status of an event (e.g., pending, approved, rejected).
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "status": "string ('pending', 'approved', 'rejected')"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Event status updated successfully",
        "event": {
            "_id": "string",
            "status": "string"
        }
    }
    ```
*   **Response (Error 400/401/403/404):**
    ```json
    {
        "message": "Error message"
    }
    ```

---

## Payment Endpoints (`/api/payments`)

### `POST /api/payments/checkout`

*   **Description:** Initiates a payment checkout process for a reservation.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "reservationId": "string",
        "method": "string ('stripe', 'paypal', or 'local')"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Payment initiated",
        "payment": {
            "_id": "string",
            "reservationId": "string",
            "amount": "number",
            "currency": "string",
            "method": "string",
            "status": "pending",
            "createdAt": "string (ISO date)"
        },
        "redirectUrl": "string (optional, for external payment gateways)"
    }
    ```
*   **Response (Error 400/401/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `POST /api/payments/verify`

*   **Description:** Verifies the status of a payment.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "paymentId": "string",
        "status": "string (optional, 'pending', 'completed', or 'failed')"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Payment status updated",
        "payment": {
            "_id": "string",
            "status": "string"
        }
    }
    ```
*   **Response (Error 400/401/404/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `GET /api/payments/me`

*   **Description:** Retrieves all payments made by the authenticated user.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    [
        {
            "_id": "string",
            "userId": "string",
            "eventId": "string",
            "reservationId": "string",
            "amount": "number",
            "currency": "string",
            "method": "string",
            "status": "string",
            "createdAt": "string (ISO date)"
        }
    ]
    ```
*   **Response (Error 401/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

---

## Reservation Endpoints (`/api/reservations`)

### `POST /api/reservations`

*   **Description:** Creates a new reservation for an event.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "eventId": "string",
        "ticketQuantity": "number (integer, min 1)"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
        "_id": "string",
        "userId": "string",
        "eventId": "string",
        "ticketQuantity": "number",
        "status": "pending",
        "createdAt": "string (ISO date)"
    }
    ```
*   **Response (Error 400/401/403/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `GET /api/reservations/me`

*   **Description:** Retrieves all reservations made by the authenticated attendee.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    [
        {
            "_id": "string",
            "userId": "string",
            "eventId": {
                "_id": "string",
                "title": "string",
                "date": "string"
            },
            "ticketQuantity": "number",
            "status": "string",
            "createdAt": "string (ISO date)"
        }
    ]
    ```
*   **Response (Error 401/403/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `DELETE /api/reservations/:id`

*   **Description:** Cancels a reservation.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Path Parameters:**
    *   `id`: `string` (Reservation ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Reservation cancelled successfully"
    }
    ```
*   **Response (Error 401/403/404/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `GET /api/reservations/event/:eventId`

*   **Description:** Retrieves all reservations for a specific event.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`, `admin`
*   **Path Parameters:**
    *   `eventId`: `string` (Event ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    [
        {
            "_id": "string",
            "userId": {
                "_id": "string",
                "name": "string",
                "email": "string"
            },
            "eventId": "string",
            "ticketQuantity": "number",
            "status": "string",
            "createdAt": "string (ISO date)"
        }
    ]
    ```
*   **Response (Error 401/403/404/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

---

## User Endpoints (`/api/users`)

### `GET /api/users`

*   **Description:** Lists all users.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    [
        {
            "_id": "string",
            "name": "string",
            "email": "string",
            "role": "string",
            "status": "string"
        }
    ]
    ```
*   **Response (Error 401/403/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `PATCH /api/users/:id/status`

*   **Description:** Updates the status of a user (e.g., active, suspended).
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Path Parameters:**
    *   `id`: `string` (User ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "status": "string ('active', 'suspended')"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "User status updated successfully",
        "user": {
            "_id": "string",
            "status": "string"
        }
    }
    ```
*   **Response (Error 400/401/403/404/500):**
    ```json
    {
        "message": "Error message"
    }
    ```

### `PATCH /api/users/me`

*   **Description:** Updates the profile of the currently authenticated user.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:** (Partial update, any of the fields below)
    ```json
    {
        "profile": {
            "bio": "string",
            "phone": "string"
        },
        "name": "string",
        "email": "string (email format)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "message": "Profile updated successfully",
        "user": {
            "_id": "string",
            "name": "string",
            "email": "string",
            "profile": {}
        }
    }
    ```
*   **Response (Error 400/401/500):**
    ```json
    {
        "message": "Error message"
    }
    ```
