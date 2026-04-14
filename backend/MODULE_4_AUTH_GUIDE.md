# MODULE 4 — AUTHENTICATION SYSTEM (JWT)

## Overview

This module implements a secure, production-ready JWT-based authentication system for the Multiplayer Quiz Platform. It includes:

- **Signup/Registration** with password hashing using bcrypt
- **Login** with credential validation and JWT token generation
- **Protected Routes** with JWT verification middleware
- **Type-safe** implementation with TypeScript

---

## Installation ✓

Dependencies installed:
- `jsonwebtoken` - JWT token generation and verification
- `bcrypt` - Secure password hashing
- Type definitions for both packages

---

## Files Created

### 1. **Utils: JWT Helper** (`src/utils/jwt.ts`)

Utility functions for token management:

```typescript
// Generate a new JWT token
const token = generateToken(userId);

// Verify a token
const payload = verifyToken(token);

// Extract token from Authorization header
const token = extractTokenFromHeader(authHeader);
```

**Token Format:**
- Algorithm: HS256
- Expiry: 7 days
- Payload: `{ userId: string, iat: number, exp: number }`

---

### 2. **Controller: Auth Logic** (`src/controllers/auth.controller.ts`)

Handles signup and login business logic:

#### **Signup**
- Validates input (username, email, password)
- Checks for duplicate email/username
- Hashes password with bcrypt (10 rounds)
- Creates user in database
- Generates JWT token
- Returns user data + token

#### **Login**
- Validates input (email, password)
- Finds user by email
- Compares password with hash
- Generates JWT token
- Returns user data + token

**Security Features:**
- Passwords are hashed with bcrypt salt rounds = 10
- Passwords are not returned in responses
- Password field has `select: false` in schema (excluded from queries by default)
- Error messages don't reveal if email/username exists (prevents user enumeration)

---

### 3. **Routes: API Endpoints** (`src/routes/auth.route.ts`)

Public authentication endpoints:

```
POST /api/auth/signup
POST /api/auth/login
```

#### **Signup Request**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### **Signup Response (201)**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### **Login Request**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### **Login Response (200)**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### **Error Response (400/401/409)**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

### 4. **Middleware: Auth Protection** (`src/middlewares/auth.middleware.ts`)

Middleware to protect routes that require authentication:

```typescript
// Protect a single route
router.get("/protected", authMiddleware, (req, res) => {
  const userId = req.user?.userId;
  // Handle request
});

// Protect all routes in a router
const protectedRouter = Router();
protectedRouter.use(authMiddleware);
protectedRouter.get("/route1", handler1);
protectedRouter.get("/route2", handler2);
```

**Usage Pattern:**
```typescript
// In app.ts or route files
import { authMiddleware } from "./middlewares/auth.middleware";
import protectedRoutes from "./routes/protected.route";

app.use("/api/protected", protectedRoutes);
// All routes in protectedRoutes will require JWT authentication
```

**How It Works:**
1. Extracts token from `Authorization` header (`Bearer <token>`)
2. Verifies token signature and expiry
3. Attaches decoded payload to `req.user`
4. Calls `next()` to proceed to route handler
5. Returns 401 error if token is missing/invalid/expired

**Request Format:**
```
GET /api/protected/profile HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 5. **Example Protected Route** (`src/routes/protected.route.ts`)

Demonstrates how to use the auth middleware:

```typescript
// GET /api/protected/profile (requires auth)
// Returns the authenticated user's ID
```

---

## Environment Variables

Update your `.env` file:

```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
JWT_EXPIRY=7d
```

⚠️ **Important:** Change `JWT_SECRET` to a strong, unique value in production!

---

## Type Definitions

The authentication system extends Express Request to include user data:

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;  // Set by authMiddleware
    }
  }
}

interface ITokenPayload {
  userId: string;
  iat?: number;    // Issued at
  exp?: number;    // Expiration time
}
```

---

## Testing the API

### Test Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### Test Protected Route (using token from signup/login)
```bash
curl -X GET http://localhost:5000/api/protected/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Security Best Practices ✅

1. **Password Hashing**: Uses bcrypt with 10 salt rounds
2. **Token Expiry**: Tokens expire after 7 days
3. **Secret Storage**: JWT_SECRET should be environment-specific (use strong values in production)
4. **Password Exclusion**: Passwords not included in API responses
5. **HTTPS**: Use HTTPS in production (not configured here, handled by infrastructure)
6. **Error Handling**: Generic error messages to prevent user enumeration
7. **Token Storage**: Client should store token securely (httpOnly cookies recommended)

---

## Next Steps (Future Modules)

- [ ] Add refresh token mechanism for better security
- [ ] Implement role-based access control (RBAC)
- [ ] Add password reset functionality
- [ ] Add email verification for signup
- [ ] Implement rate limiting on auth endpoints
- [ ] Add 2FA (Two-Factor Authentication)
- [ ] Integrate with WebSockets for session validation

---

## Summary

The authentication module is now production-ready with:
- ✅ Secure password hashing
- ✅ JWT token generation and verification
- ✅ Protected route middleware
- ✅ Type-safe implementation
- ✅ Comprehensive error handling
- ✅ Clean, modular code structure
