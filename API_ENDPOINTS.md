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

*   **Description:** Get comprehensive dashboard statistics
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": {
        "totalUsers": 1250,
        "totalEvents": 340,
        "totalReservations": 2890,
        "totalRevenue": 125000.50,
        "activeEvents": 85,
        "pendingReservations": 45,
        "newUsersThisMonth": 120,
        "revenueThisMonth": 15000.00,
        "topCategories": [
          {
            "category": "Music",
            "eventCount": 120,
            "revenue": 45000.00,
            "reservationCount": 890
          }
        ],
        "recentActivity": [
          {
            "_id": "reservation_id",
            "type": "new_reservation",
            "description": "Jane Doe reserved 2 ticket(s) for Community Tech Meetup",
            "userId": "user_id_jane",
            "timestamp": "2024-01-20T14:00:00Z",
            "metadata": {
              "eventId": "event_id_tech_meetup",
              "ticketQuantity": 2
            }
          },
          {
            "_id": "user_id_john",
            "type": "user_registration",
            "description": "New user registered: John Doe",
            "userId": "user_id_john",
            "timestamp": "2024-01-19T10:30:00Z",
            "metadata": {
              "email": "john.doe@example.com"
            }
          }
        ]
      }
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

### `GET /api/dashboard/admin/users`

*   **Description:** Get a paginated and filterable list of all users with detailed stats.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `page` (number, optional, default: 1): Page number for pagination.
    *   `limit` (number, optional, default: 10): Number of items per page.
    *   `search` (string, optional): Search term for user name or email.
    *   `status` (string, optional): Filter by status (`active`, `banned`).
    *   `sortBy` (string, optional, default: `registrationDate`): Field to sort by (`registrationDate`, `name`, `totalSpent`).
    *   `sortOrder` (string, optional, default: `desc`): Sort order (`asc`, `desc`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "attendee",
          "initials": "JD",
          "phone": "+1234567890",
          "bio": "Event enthusiast",
          "registrationDate": "2024-01-01T00:00:00Z",
          "isActive": true,
          "isBanned": false,
          "totalReservations": 15,
          "totalSpent": 750.00,
          "organization": "Tech Corp"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 1250,
        "pages": 125
      }
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

### `GET /api/dashboard/admin/events`

*   **Description:** Get a paginated and filterable list of all events with detailed stats.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `page` (number, optional, default: 1): Page number for pagination.
    *   `limit` (number, optional, default: 10): Number of items per page.
    *   `search` (string, optional): Search term for event title or description.
    *   `sortBy` (string, optional, default: `createdAt`): Field to sort by.
    *   `sortOrder` (string, optional, default: `desc`): Sort order (`asc`, `desc`).
    *   `status` (string, optional): Filter by derived status (`published`, `draft`, `cancelled`, `completed`).
    *   `category` (string, optional): Filter by event category.
    *   `approvalStatus` (string, optional): Filter by approval status (`pending`, `approved`, `rejected`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "event_id",
          "title": "Tech Conference 2024",
          "description": "Annual technology conference",
          "date": "2024-03-15T09:00:00Z",
          "time": "09:00",
          "location": "Convention Center",
          "capacity": 500,
          "price": 150.00,
          "category": "Technology",
          "image": "event_image_url",
          "availableSeats": 250,
          "organizer": {
            "_id": "organizer_id",
            "name": "Event Organizer",
            "email": "organizer@example.com"
          },
          "totalReservations": 250,
          "totalRevenue": 37500.00,
          "status": "published",
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-15T10:30:00Z",
          "isApproved": true,
          "approvalStatus": "approved"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 340,
        "pages": 34
      }
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/admin/reservations`

*   **Description:** Get a paginated and filterable list of all reservations with detailed info.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `page` (number, optional, default: 1): Page number for pagination.
    *   `limit` (number, optional, default: 10): Number of items per page.
    *   `search` (string, optional): Search term for user name/email or event title.
    *   `sortBy` (string, optional, default: `reservationDate`): Field to sort by (`reservationDate`, `totalAmount`).
    *   `sortOrder` (string, optional, default: `desc`): Sort order (`asc`, `desc`).
    *   `status` (string, optional): Filter by reservation status (e.g., `pending`, `reserved`, `cancelled`).
    *   `paymentStatus` (string, optional): Filter by payment status (e.g., `completed`, `pending`, `failed`, `unpaid`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "reservation_id",
          "userId": "user_id",
          "eventId": "event_id",
          "event": {
            "_id": "event_id",
            "title": "Tech Conference 2024",
            "date": "2024-03-15T09:00:00Z",
            "time": "09:00",
            "location": "Convention Center"
          },
          "user": {
            "_id": "user_id",
            "name": "John Doe",
            "email": "john@example.com"
          },
          "ticketQuantity": 2,
          "totalAmount": 300.00,
          "status": "reserved",
          "paymentStatus": "completed",
          "reservationDate": "2024-01-10T10:00:00Z",
          "paymentMethod": "stripe",
          "transactionId": "txn_123456",
          "createdAt": "2024-01-10T10:00:00Z",
          "updatedAt": "2024-01-10T10:05:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 2890,
        "pages": 289
      }
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/admin/analytics/revenue`

*   **Description:** Get time-series data for revenue and reservations for chart display.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `period` (string, optional, default: `month`): Time period (`week`, `month`, `year`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "date": "2024-01-01",
          "revenue": 5000.00,
          "reservations": 50
        },
        {
          "date": "2024-01-02",
          "revenue": 7500.00,
          "reservations": 75
        }
      ]
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/admin/analytics/users`

*   **Description:** Get time-series data for user growth for chart display.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `period` (string, optional, default: `month`): Time period (`week`, `month`, `year`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "date": "2024-01-01",
          "newUsers": 25,
          "totalUsers": 1000
        },
        {
          "date": "2024-01-02",
          "newUsers": 30,
          "totalUsers": 1030
        }
      ]
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/admin/activity-logs`

*   **Description:** Get a paginated and filterable list of all system activity logs.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `page` (number, optional, default: 1): Page number for pagination.
    *   `limit` (number, optional, default: 20): Number of items per page.
    *   `search` (string, optional): Search term for the log description.
    *   `sortBy` (string, optional, default: `timestamp`): Field to sort by.
    *   `sortOrder` (string, optional, default: `desc`): Sort order (`asc`, `desc`).
    *   `type` (string, optional): Filter by activity type (e.g., `user_registration`, `event_created`).
    *   `dateFrom` (string, optional, ISO Date): Filter logs created on or after this date.
    *   `dateTo` (string, optional, ISO Date): Filter logs created on or before this date.
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "log_id",
          "type": "user_registration",
          "description": "New user registered: John Doe",
          "userId": {
            "_id": "user_id",
            "name": "John Doe",
            "email": "john.doe@example.com"
          },
          "eventId": null,
          "timestamp": "2024-01-15T10:30:00Z",
          "metadata": {
            "userAgent": "Mozilla/5.0...",
            "ipAddress": "192.168.1.1"
          }
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 5000,
        "pages": 250
      }
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
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
      "success": true,
      "data": {
        "totalEvents": 12,
        "upcomingEvents": 5,
        "totalReservations": 150,
        "totalRevenue": 7500.00,
        "totalPaidReservations": 120,
        "topPerformingEvents": [
          {
            "eventId": "event_id_1",
            "title": "Top Event by Revenue",
            "revenue": 2500.00,
            "paidReservations": 50
          }
        ],
        "recentActivity": [
          {
            "type": "new_reservation",
            "description": "John Doe made a reservation for \"Top Event by Revenue\"",
            "timestamp": "2024-01-20T14:00:00Z",
            "metadata": {
              "reservationId": "reservation_id",
              "userId": "user_id",
              "eventId": "event_id_1",
              "ticketQuantity": 2
            }
          }
        ]
      }
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/organizer/analytics`

*   **Description:** Get time-series data for revenue and reservations for the organizer's events.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `period` (string, optional, default: `month`): Time period (`week`, `month`, `year`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "date": "2024-07-01",
          "revenue": 1500.00,
          "reservations": 30
        },
        {
          "date": "2024-07-02",
          "revenue": 1250.00,
          "reservations": 25
        }
      ]
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/organizer/events`

*   **Description:** Get a paginated and filterable list of the organizer's own events.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `page` (number, optional, default: 1): Page number for pagination.
    *   `limit` (number, optional, default: 10): Number of items per page.
    *   `search` (string, optional): Search term for event title.
    *   `sortBy` (string, optional, default: `createdAt`): Field to sort by.
    *   `sortOrder` (string, optional, default: `desc`): Sort order (`asc`, `desc`).
    *   `status` (string, optional): Filter by derived status (`published`, `draft`, `cancelled`, `completed`).
    *   `approvalStatus` (string, optional): Filter by approval status (`pending`, `approved`, `rejected`).
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "event_id",
          "title": "My Awesome Event",
          "date": "2024-08-15T09:00:00Z",
          "price": 50.00,
          "availableSeats": 80,
          "totalReservations": 20,
          "totalRevenue": 1000.00,
          "status": "published",
          "approvalStatus": "approved",
          "createdAt": "2024-06-01T00:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 12,
        "pages": 2
      }
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
    }
    ```

### `GET /api/dashboard/organizer/reservations`

*   **Description:** Get a paginated and filterable list of reservations for the organizer's events.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Query Parameters:**
    *   `page` (number, optional, default: 1): Page number for pagination.
    *   `limit` (number, optional, default: 10): Number of items per page.
    *   `search` (string, optional): Search term for attendee name/email.
    *   `sortBy` (string, optional, default: `reservationDate`): Field to sort by.
    *   `sortOrder` (string, optional, default: `desc`): Sort order (`asc`, `desc`).
    *   `status` (string, optional): Filter by reservation status (`pending`, `reserved`, `cancelled`).
    *   `paymentStatus` (string, optional): Filter by payment status (`completed`, `pending`, `failed`, `unpaid`).
    *   `eventId` (string, optional): Filter by a specific event ID.
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "reservation_id",
          "event": {
            "_id": "event_id",
            "title": "My Awesome Event"
          },
          "user": {
            "_id": "user_id",
            "name": "Jane Doe",
            "email": "jane@example.com"
          },
          "ticketQuantity": 2,
          "totalAmount": 100.00,
          "status": "reserved",
          "paymentStatus": "completed",
          "reservationDate": "2024-07-10T10:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 150,
        "pages": 15
      }
    }
    ```
*   **Response (Error 401/403):**
    ```json
    {
        "message": "Unauthorized or Forbidden"
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
