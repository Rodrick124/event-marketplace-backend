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

### `POST /api/auth/forgot-password`

*   **Description:** Initiates the password reset process for a user. It sends an email with a reset link if the user exists.
*   **Authentication:** None
*   **Request Body:**
    ```json
    {
        "email": "string (email format)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "If an account with that email exists, a password reset link has been sent."
    }
    ```
*   **Response (Error 400 - Validation):**
    ```json
    {
        "success": false,
        "message": "Validation failed",
        "errors": [ { "msg": "Please provide a valid email", "path": "email", ... } ]
    }
    ```

### `POST /api/auth/reset-password/:token`

*   **Description:** Resets the user's password using a valid token from the reset email.
*   **Authentication:** None
*   **Path Parameters:**
    *   `token`: `string` (The password reset token from the email link)
*   **Request Body:**
    ```json
    {
        "newPassword": "string (min 6 characters)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Password reset successfully."
    }
    ```
*   **Response (Error 400 - Validation):**
    ```json
    {
        "success": false,
        "message": "Validation failed",
        "errors": [ { "msg": "New password must be at least 6 characters long", "path": "newPassword", ... } ]
    }
    ```
*   **Response (Error 400 - Invalid Token):**
    ```json
    {
        "success": false,
        "message": "Invalid or expired token."
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

### `PATCH /api/dashboard/admin/events/:id/status`

*   **Description:** Updates the approval status of an event (`pending`, `approved`, `rejected`). If an event is rejected, all its active reservations will be cancelled.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Body:**
    ```json
    {
        "status": "string ('pending', 'approved', 'rejected')"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "data": {
            "_id": "string",
            "status": "approved"
        }
    }
    ```
*   **Response (Error 400/401/403/404):**
    ```json
    {
        "success": false,
        "message": "Event not found"
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

### `GET /api/dashboard/organizer/events/:id`

*   **Description:** Retrieves a single event with detailed stats for the organizer dashboard.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Response (Success 200):**
    ```json
    {
      "success": true,
      "data": {
        "_id": "event_id",
        "title": "My Awesome Event",
        "description": "An awesome event.",
        "date": "2024-08-15T09:00:00Z",
        "price": 50.00,
        "availableSeats": 80,
        "totalSeats": 100,
        "status": "pending",
        "stats": {
            "tickets": {
                "reserved": 20,
                "cancelled": 5
            },
            "revenue": 1000.00
        }
      }
    }
    ```
*   **Response (Error 401/403/404):**
    ```json
    {
        "success": false,
        "message": "Event not found or you are not authorized to view it."
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

### `POST /api/dashboard/organizer/create-event`

*   **Description:** Creates a new event from the organizer dashboard. The organizer ID is automatically assigned from the authenticated user.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "title": "string",
        "description": "string",
        "category": "string",
        "location": {
            "address": "string",
            "city": "string",
            "country": "string"
        },
        "date": "string (ISO 8601 format)",
        "time": "string",
        "price": "number",
        "totalSeats": "number",
        "imageUrl": "string (optional)"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
        "success": true,
        "data": {
            "_id": "string",
            "organizerId": "string",
            "title": "string",
            "description": "string",
            "category": "string",
            "location": {},
            "date": "string",
            "time": "string",
            "price": 0,
            "totalSeats": 0,
            "availableSeats": 0,
            "status": "pending",
            "createdAt": "string",
            "updatedAt": "string"
        }
    }
    ```
*   **Response (Error 400/401/403):**
    ```json
    {
        "success": false,
        "message": "Error message"
    }
    ```

### `PATCH /api/dashboard/organizer/events/:id`

*   **Description:** Updates an event from the organizer dashboard. The organizer ID is automatically checked to ensure ownership.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Body:** (Partial update of event fields)
    ```json
    {
        "title": "My Updated Awesome Event",
        "description": "Now with more awesome.",
        "totalSeats": 150
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "data": {
            "_id": "string",
            "organizerId": "string",
            "title": "My Updated Awesome Event",
            "description": "Now with more awesome.",
            "totalSeats": 150,
            "availableSeats": 130,
            "status": "approved"
        }
    }
    ```
*   **Response (Error 400/401/403/404):**
    ```json
    {
        "success": false,
        "message": "Error message"
    }
    ```

### `PATCH /api/dashboard/organizer/events/:id/cancel`

*   **Description:** Cancels an event from the organizer dashboard. This sets the event's status to rejected and cancels all associated active reservations.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Body:** (Empty)
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Event has been cancelled successfully. All active reservations have also been cancelled.",
        "data": {
            "_id": "string",
            "organizerId": "string",
            "title": "My Awesome Event",
            "status": "rejected"
        }
    }
    ```
*   **Response (Error 401/403/404):**
    ```json
    {
        "success": false,
        "message": "Event not found or you are not authorized to cancel it."
    }
    ```

### `DELETE /api/dashboard/organizer/events/:id`

*   **Description:** Deletes an event from the organizer dashboard. This is a hard delete and is only permitted if the event has no reservations. For events with reservations, use the `cancel` endpoint instead. This route now uses the same robust logic as the generic `DELETE /api/events/:id` endpoint.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Body:** (Empty)
*   **Response (Success 204 No Content):** (Empty response body)
*   **Response (Error 400/401/403/404):**
    ```json
    {
        "success": false,
        "message": "Cannot delete an event that has reservations. Please use the cancel action instead."
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

### `GET /api/dashboard/attendee/events`

*   **Description:** Retrieves a list of all reservations made by the authenticated attendee, including active and cancelled ones, with full event details included.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "data": [
            {
                "_id": "reservationId1",
                "userId": "attendeeUserId",
                "ticketQuantity": 2,
                "totalPrice": 50,
                "status": "reserved",
                "createdAt": "2024-07-20T10:00:00Z",
                "eventId": {
                    "_id": "eventId1",
                    "title": "Community Tech Meetup",
                    "description": "Join us for a friendly meetup...",
                    "category": "Tech",
                    "location": {
                        "address": "123 Main St",
                        "city": "Techville",
                        "country": "USA"
                    },
                    "date": "2024-08-15T18:30:00Z",
                    "time": "18:30",
                    "price": 25.0,
                    "imageUrl": "https://via.placeholder.com/1024x768.png/008877?text=Tech+Meetup",
                    "status": "approved"
                }
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

*   **Description:** Updates an existing event. Organizers can only update their own events. Admins can update any event. The event `status` cannot be changed via this endpoint. If `totalSeats` is updated, `availableSeats` will be recalculated.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`, `admin`
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:** (Partial update of event fields)
    ```json
    {
        "title": "My Updated Awesome Event",
        "description": "Now with more awesome.",
        "totalSeats": 150
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "data": {
            "_id": "string",
            "title": "My Updated Awesome Event",
            "description": "Now with more awesome.",
            "totalSeats": 150,
            "availableSeats": 130
        }
    }
    ```
*   **Response (Error 400/401/403/404):**
    ```json
    {
        "success": false,
        "message": "Error message"
    }
    ```

### `DELETE /api/events/:id`

*   **Description:** Deletes an event. This is a hard delete and is only permitted if the event has no reservations. For events with reservations, use the `cancel` action instead. Organizers can only delete their own events.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `organizer`, `admin`
*   **Path Parameters:**
    *   `id`: `string` (Event ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 204 No Content):** (Empty response body)
*   **Response (Error 400):**
    ```json
    {
        "success": false,
        "message": "Cannot delete an event that has reservations. Please use the cancel action instead."
    }
    ```
*   **Response (Error 401/403/404):**
    ```json
    {
        "success": false,
        "message": "Event not found or you are not authorized to delete it."
    }
    ```

---

## Payment Endpoints (`/api/payments`)

### `POST /api/payments/checkout`

*   **Description:** Initiates a payment checkout process for a reservation. Creates a `pending` payment record and returns the necessary information for the client to proceed with the payment provider.
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
*   **Response (Success 200 - Stripe):**
    ```json
    {
        "clientSecret": "string (Stripe Payment Intent client secret)",
        "paymentId": "string (Your internal Payment ID)"
    }
    ```
*   **Response (Success 200 - PayPal):**
    ```json
    {
        "orderId": "string (PayPal Order ID)",
        "paymentId": "string (Your internal Payment ID)"
    }
    ```
*   **Response (Success 200 - Local):**
    ```json
    {
        "paymentId": "string (Your internal Payment ID)"
    }
    ```
*   **Response (Error 400/404/500):**
    ```json
    {
        "message": "Reservation not found or invalid status"
    }
    ```

### `POST /api/payments/:paymentId/confirm`

*   **Description:** Confirms a payment after it has been processed on the client-side (e.g., after Stripe.js confirmation or PayPal approval). This endpoint performs server-side verification with the payment provider.
*   **Authentication:** Required (JWT in Authorization header)
*   **Path Parameters:**
    *   `paymentId`: `string` (The internal Payment ID from the checkout step)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:** (Empty)
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Payment status updated to completed",
        "data": {
            "_id": "string",
            "status": "completed"
        }
    }
    ```
*   **Response (Error 400/404/500):**
    ```json
    {
        "success": false,
        "message": "Failed to capture PayPal payment. It may have already been processed or expired."
    }
    ```


### `PATCH /api/payments/:paymentId/status`

*   **Description:** Manually updates the status of a payment. Intended for administrators to confirm offline ('local') payments or resolve issues.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `admin`, `organizer`
*   **Path Parameters:**
    *   `paymentId`: `string` (The internal Payment ID)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "status": "string ('completed', 'failed', 'pending')"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "_id": "string",
        "status": "completed"
    }
    ```
*   **Response (Error 401/403/404):**
    ```json
    {
        "message": "Payment not found"
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

## Cart Endpoints (`/api/cart`)

All endpoints in this section require authentication as an `attendee`.

### `GET /api/cart`

*   **Description:** Retrieves the current user's shopping cart.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "data": {
            "_id": "cart_id",
            "userId": "user_id",
            "items": [
                {
                    "_id": "cart_item_id",
                    "quantity": 2,
                    "eventId": {
                        "_id": "event_id",
                        "title": "Community Tech Meetup",
                        "price": 25.00,
                        "imageUrl": "image_url",
                        "availableSeats": 98,
                        "date": "2024-08-15T18:30:00Z"
                    }
                }
            ]
        }
    }
    ```

### `POST /api/cart`

*   **Description:** Adds an item (event tickets) to the cart. If the item already exists, the quantity is increased.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Request Body:**
    ```json
    {
        "eventId": "string (Event ID)",
        "quantity": "number (integer, min 1)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Item added to cart.",
        "data": { "... cart object ..." }
    }
    ```

### `DELETE /api/cart`

*   **Description:** Clears all items from the user's cart.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Cart cleared.",
        "data": { "... empty cart object ..." }
    }
    ```

### `PATCH /api/cart/items/:itemId`

*   **Description:** Updates the quantity of a specific item in the cart.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Path Parameters:**
    *   `itemId`: `string` (Cart Item ID)
*   **Request Body:**
    ```json
    {
        "quantity": "number (integer, min 1)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Cart updated.",
        "data": { "... cart object ..." }
    }
    ```

### `DELETE /api/cart/items/:itemId`

*   **Description:** Removes a specific item from the cart.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Path Parameters:**
    *   `itemId`: `string` (Cart Item ID)
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Item removed from cart.",
        "data": { "... cart object ..." }
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
        "totalPrice": "number",
        "status": "reserved",
        "createdAt": "string (ISO date)"
    }
    ```
*   **Response (Error 400/401/403/500):**
    ```json
    {
        "message": "Event not available or insufficient seats"
    }
    ```

### `POST /api/reservations/from-cart`

*   **Description:** Creates reservations for all items in the user's cart. This is the "checkout" action for a cart. It atomically reserves seats and clears the cart upon success.
*   **Authentication:** Required (JWT in Authorization header)
*   **Roles:** `attendee`
*   **Request Body:** (Empty)
*   **Response (Success 201):**
    ```json
    {
        "success": true,
        "message": "Reservations created successfully from your cart. Please proceed to payment for each reservation.",
        "data": [
            {
                "_id": "reservation_id_1",
                "userId": "user_id",
                "eventId": "event_id_1",
                "ticketQuantity": 2,
                "status": "reserved"
            },
            {
                "_id": "reservation_id_2",
                "userId": "user_id",
                "eventId": "event_id_2",
                "ticketQuantity": 1,
                "status": "reserved"
            }
        ]
    }
    ```
*   **Response (Error 400/409):**
    ```json
    {
        "success": false,
        "message": "Your cart is empty."
    }
    ```
    or
    ```json
    {
        "success": false,
        "message": "Could not reserve all items due to a stock change. Please try again."
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
            "totalPrice": "number",
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
        "message": "Reservation cancelled successfully",
        "reservation": {
            "_id": "string",
            "userId": "string",
            "eventId": "string",
            "ticketQuantity": "number",
            "totalPrice": "number",
            "status": "cancelled",
            "createdAt": "string (ISO date)",
            "updatedAt": "string (ISO date)"
        }
    }
    ```
*   **Response (Error 401/403/404/500):**
    ```json
    {
        "message": "Reservation not found or you do not own it."
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

### `GET /api/users/me`

*   **Description:** Retrieves the profile of the currently authenticated user.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "data": {
            "_id": "string",
            "name": "string",
            "email": "string",
            "role": "string",
            "status": "active",
            "profile": {
                "bio": "string",
                "phone": "string"
            },
            "createdAt": "string (ISO date)",
            "updatedAt": "string (ISO date)"
        }
    }
    ```
*   **Response (Error 401/404):**
    ```json
    {
        "success": false,
        "message": "User not found."
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
            "bio": "string (optional)",
            "phone": "string (optional)",
            "organization": "string (optional)"
        },
        "name": "string (optional)",
        "email": "string (optional, email format)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Profile updated successfully",
        "data": {
            "_id": "string",
            "name": "string",
            "email": "string",
            "profile": {},
            "role": "string",
            "status": "string"
        }
    }
    ```
*   **Response (Error 400/401/500):**
    ```json
    {
        "success": false,
        "message": "Email already in use."
    }
    ```

### `PATCH /api/users/me/password`

*   **Description:** Changes the password for the currently authenticated user.
*   **Authentication:** Required (JWT in Authorization header)
*   **Request Headers:**
    ```
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **Request Body:**
    ```json
    {
        "currentPassword": "string",
        "newPassword": "string (min 6 characters)"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
        "success": true,
        "message": "Password changed successfully."
    }
    ```
*   **Response (Error 400 - Validation):**
    ```json
    {
        "success": false,
        "message": "Validation failed",
        "errors": [ { "msg": "New password must be at least 6 characters long", "path": "newPassword", ... } ]
    }
    ```
*   **Response (Error 401 - Incorrect Password):**
    ```json
    {
        "success": false,
        "message": "Incorrect current password."
    }
    ```
