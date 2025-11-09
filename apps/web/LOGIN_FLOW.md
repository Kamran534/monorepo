# Web App Login Flow

## Overview

The web app login implements a smart online/offline authentication system that works as follows:

## Login Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Login Attempt                      │
│                  (username/email + password)                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Check Server Status │
                  └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  Server ONLINE  │           │  Server OFFLINE │
    └────────┬────────┘           └────────┬────────┘
             │                              │
             ▼                              │
    ┌─────────────────────┐                │
    │ Try Server Login    │                │
    │ POST /api/auth/login│                │
    └────────┬────────────┘                │
             │                              │
      ┌──────┴──────┐                      │
      │             │                      │
      ▼             ▼                      │
  SUCCESS      NETWORK ERROR               │
      │             │                      │
      │             └──────────┬───────────┘
      │                        │
      │                        ▼
      │             ┌─────────────────────────┐
      │             │  Try IndexedDB Login    │
      │             └────────┬────────────────┘
      │                      │
      │               ┌──────┴──────┐
      │               │             │
      │               ▼             ▼
      │         USER EXISTS    USER NOT FOUND
      │               │             │
      │        ┌──────┴──────┐      │
      │        │             │      │
      │        ▼             ▼      ▼
      │   PASSWORD      PASSWORD   ERROR:
      │     MATCH       WRONG      "User not found
      │        │           │        in local database"
      │        │           │
      ▼        ▼           ▼
  ┌────────────────────────────┐
  │    Login Successful        │
  │                            │
  │  - Save to sessionStorage  │
  │  - Set auth token          │
  │  - Initialize sync service │
  │  - Redirect to dashboard   │
  └────────────────────────────┘
```

## Detailed Flow

### 1. Online Login (Server Available)

```typescript
User enters credentials
   ↓
Check if server is online (DataSourceManager)
   ↓
Send POST to /api/auth/login { username, password }
   ↓
┌─────────────────────────────────────────┐
│ Server Response                         │
│ {                                       │
│   user: { id, username, email, ... },   │
│   token: "jwt-token-here"               │
│ }                                       │
└─────────────────────────────────────────┘
   ↓
Set auth token in API client
   ↓
Server automatically saves user to IndexedDB
(including passwordHash for offline login)
   ↓
Initialize Sync Service
   ↓
Start periodic sync (every 1 hour)
   ↓
Sync User table immediately
   ↓
Return { success: true, user, token, isOffline: false }
```

**User is now stored in IndexedDB and can login offline later!**

### 2. Offline Login (Server Unavailable or Network Error)

```typescript
User enters credentials
   ↓
Server is offline or network error occurred
   ↓
Check if user exists in IndexedDB:
   ↓
Query: SELECT * FROM User WHERE username = ? OR email = ?
   ↓
┌─────────────────────┐        ┌──────────────────────────┐
│  User NOT Found     │        │  User Found              │
│                     │        │                          │
│  Return Error:      │        │  Load bcryptjs           │
│  "User not found in │        │  Compare password hash   │
│   local database.   │        │                          │
│   Please login      │        │  ┌────────────────────┐  │
│   online first"     │        │  │ Password matches?  │  │
│                     │        │  └─────┬──────────────┘  │
│                     │        │        │                 │
│                     │        │  ┌─────┴─────┐           │
│                     │        │  │           │           │
│                     │        │  YES         NO          │
│                     │        │  │           │           │
│                     │        │  │     Return Error:     │
│                     │        │  │     "Invalid password"│
│                     │        │  │                       │
│                     │        │  Return {               │
│                     │        │    success: true,       │
│                     │        │    user,                │
│                     │        │    isOffline: true      │
│                     │        │  }                      │
└─────────────────────┘        └──────────────────────────┘
```

### 3. Error Handling

The login returns different errors based on the scenario:

#### Online Login Errors

1. **Invalid Credentials (401/403)**
   ```json
   {
     "success": false,
     "isOffline": false,
     "error": "Invalid credentials. Please check your username and password."
   }
   ```
   ❌ **Does NOT fall back to offline login**

2. **Network/Server Error (500, timeout, etc.)**
   ```json
   // Automatically falls back to offline login
   ```
   ✅ **Falls back to offline login**

#### Offline Login Errors

1. **User Not Found**
   ```json
   {
     "success": false,
     "isOffline": true,
     "error": "User not found in local database. Please login online first to cache your credentials."
   }
   ```

2. **Wrong Password**
   ```json
   {
     "success": false,
     "isOffline": true,
     "error": "Invalid password. Please check your credentials."
   }
   ```

## User Data Storage

### When User Logs In Online

```typescript
POST /api/auth/login
   ↓
Server returns user + token
   ↓
UserRepository.fetchAndSaveOfflineUserData(userId)
   ↓
GET /api/auth/user/:userId (includes passwordHash)
   ↓
Save to IndexedDB:
┌─────────────────────────────────────────┐
│ User {                                  │
│   id: "user-123",                       │
│   username: "john_doe",                 │
│   email: "john@example.com",            │
│   firstName: "John",                    │
│   lastName: "Doe",                      │
│   passwordHash: "$2a$10$...",  ← SAVED! │
│   roleId: "role-1",                     │
│   isActive: 1,                          │
│   createdAt: "2025-01-01",              │
│   updatedAt: "2025-01-01"               │
│ }                                       │
└─────────────────────────────────────────┘
```

The `passwordHash` is critical for offline login verification!

## Code Examples

### Login Component

```typescript
import { useWebAuth } from '../providers/WebAuthProvider';

function Login() {
  const { login } = useWebAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const success = await login(username, password, false);
    if (success) {
      navigate('/dashboard');
    } else {
      // Error is automatically set by the auth provider
      setError('Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Username or Email"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Using Auth Context

```typescript
import { useWebAuth } from '../providers/WebAuthProvider';

function Dashboard() {
  const { isAuthenticated, user, isOffline } = useWebAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <h1>Welcome, {user?.firstName}!</h1>
          <p>Mode: {isOffline ? '🔴 Offline' : '🟢 Online'}</p>
        </>
      ) : (
        <Navigate to="/login" />
      )}
    </div>
  );
}
```

## Testing the Login Flow

### Test 1: First Time Login (Online)

```bash
# Server must be running
npm run dev

# 1. Open browser to http://localhost:4200
# 2. Enter valid credentials from server
# 3. Click "Sign In"
# 4. Should see: "Online login successful"
# 5. Check IndexedDB (DevTools > Application > IndexedDB > cpos_web_db > User)
# 6. User should be stored with passwordHash
```

### Test 2: Offline Login (After Online Login)

```bash
# 1. First login online (Test 1)
# 2. Logout
# 3. Stop the server
# 4. Try to login with same credentials
# 5. Should see: "Offline login successful"
# 6. App should work in offline mode
```

### Test 3: Offline Login (User Not Cached)

```bash
# 1. Clear IndexedDB (DevTools > Application > Clear Storage)
# 2. Make sure server is stopped
# 3. Try to login
# 4. Should see error: "User not found in local database. Please login online first to cache your credentials."
```

### Test 4: Wrong Password Offline

```bash
# 1. Login online first to cache user
# 2. Logout
# 3. Stop server
# 4. Try to login with wrong password
# 5. Should see: "Invalid password. Please check your credentials."
```

### Test 5: Invalid Credentials Online

```bash
# 1. Server running
# 2. Try to login with wrong credentials
# 3. Should see: "Invalid credentials. Please check your username and password."
# 4. Should NOT fall back to offline login
```

## Browser Console Logs

When debugging, check the console for these logs:

### Online Login Success
```
[WebUserRepository] Attempting online login...
[WebUserRepository] Online login successful
[WebDataAccessService] Sync service initialized
[WebDataAccessService] User table synced
[WebDataAccessService] Periodic sync started
```

### Offline Login Success
```
[WebUserRepository] Online login failed (network/server error), trying offline...
[WebUserRepository] Attempting offline login...
[WebUserRepository] Offline login successful
```

### User Not Found
```
[WebUserRepository] Attempting offline login...
[WebUserRepository] User not found in local database
```

## API Endpoints Required

The backend must implement these endpoints:

### POST /api/auth/login
```typescript
Request:
{
  username: string,  // Can be username or email
  password: string
}

Response:
{
  user: {
    id: string,
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    roleId: string,
    isActive: number,
    ...
  },
  token: string  // JWT token
}
```

### GET /api/auth/user/:userId
```typescript
Response:
{
  id: string,
  username: string,
  email: string,
  firstName: string,
  lastName: string,
  passwordHash: string,  // ← MUST include for offline login!
  roleId: string,
  isActive: number,
  ...
}
```

## Security Notes

1. **PasswordHash Storage**: The passwordHash is stored in IndexedDB for offline login. This is necessary for offline authentication but should only be the hashed version (bcrypt), never plain text.

2. **Token Storage**: JWT tokens are stored in sessionStorage or localStorage. Clear on logout.

3. **HTTPS Required**: In production, always use HTTPS to prevent token interception.

4. **Token Expiry**: Implement token refresh logic for long-running sessions.

## Summary

✅ **First Login**: Must be online to cache user data in IndexedDB
✅ **Subsequent Logins**: Can be online or offline
✅ **User Not Found**: Clear error message if user not cached
✅ **Wrong Password**: Different error for wrong password vs user not found
✅ **Auto-Fallback**: Network errors automatically try offline login
✅ **Smart Detection**: Auth errors (401/403) don't fall back to offline
✅ **Sync Service**: Automatically initializes after successful online login

The login system is now production-ready with full online/offline support! 🎉
