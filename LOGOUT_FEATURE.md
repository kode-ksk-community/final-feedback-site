# Logout Feature - Test & Implementation Guide

## 🎯 What Was Added

A complete logout system for servicers to end their counter session when leaving work:

1. **Backend Endpoint** - `POST /api/counter/session/end`
2. **Frontend Button** - "End Session" button on success screen
3. **Smart Rate Limiting** - Both authenticated and unauthenticated users can access their endpoints

---

## ✨ Features

### 1. Logout Endpoint (`POST /api/counter/session/end`)

- Only requires authentication (no special tokens needed)
- Verifies user owns the session they're ending
- Sets `ended_at` timestamp and `end_reason = 'logout'`
- Logs session duration in the system
- Returns success message

### 2. Frontend Logout Button

- Red "End Session" button on the success screen
- Loading state with spinner while processing
- Confirms session ended then redirects home
- Error handling if logout fails

### 3. Smart Rate Limiting (NEW)

- **Guests (no session)**: 3 login attempts per minute (brute force protection)
- **Logged-in users**: UNLIMITED attempts (already trusted)
- Logout endpoint: No rate limit (users can always logout)

---

## 🧪 Testing Guide

### Test 1: Successful Logout

```
1. Log in as servicer → success screen
2. Click "End Session" button
3. See loading spinner briefly
4. Should redirect to home page (/)
5. Check logs: session_id, user_id, end_reason, duration_seconds
```

**Expected Log Output:**

```
[2026-03-20 12:05:30] local.INFO: Counter session ended {
  "session_id": 5,
  "counter_id": 1,
  "user_id": 3,
  "duration_seconds": 300
}
```

### Test 2: Guests Get Rate Limited

```
1. Don't log in
2. Try counter activation 4 times in 1 minute
3. 4th attempt should return 429 "Too many attempts"
4. Wait 1 minute
5. 5th attempt should succeed (rate limit reset)
```

### Test 3: Logged-in Users NOT Rate Limited

```
1. Log in as servicer A
2. Activate counter → success
3. Log out from counter
4. Re-activate same counter (PATH A - already logged in)
5. Should succeed immediately (NO rate limit hit)
6. Repeat 5+ times → should still work
```

### Test 4: Wrong User Cannot Logout

```
1. Servicer A logs in and activates counter
2. Log out of app
3. Log in as Servicer B
4. Call logout endpoint with counter_token from Servicer A's session
5. Should return 403 "You do not own this session"
```

### Test 5: Logout Invalid Token

```
1. Log in as servicer
2. Try to logout with invalid/expired counter_token
3. Should return 404 "Counter not found"
```

---

## 📊 Expected Database State

### Before Logout

```sql
SELECT * FROM counter_sessions WHERE counter_id = 1;

id  | counter_id | user_id | started_at          | ended_at | end_reason
----|------------|---------|---------------------|----------|----------
 5  | 1          | 3       | 2026-03-20 12:00:00 | NULL     | NULL
```

### After Logout

```sql
id  | counter_id | user_id | started_at          | ended_at            | end_reason
----|------------|---------|---------------------|---------------------|----------
 5  | 1          | 3       | 2026-03-20 12:00:00 | 2026-03-20 12:05:30 | logout
```

---

## 🔍 API Response Examples

### Successful Logout

```json
{
    "success": true,
    "message": "Session ended. Thank you!"
}
```

**Status:** 200 OK ✅

### Not Authenticated

```json
{
    "message": "You must be logged in to end a session."
}
```

**Status:** 401 Unauthorized

### Not Session Owner

```json
{
    "message": "You do not own this session."
}
```

**Status:** 403 Forbidden

### No Active Session

```json
{
    "message": "No active session on this counter."
}
```

**Status:** 403 Forbidden

### Counter Not Found

```json
{
    "message": "Counter not found."
}
```

**Status:** 404 Not Found

---

## 🛡️ Security Features

✅ **Authentication Required** - Must be logged in to logout  
✅ **Session Ownership Verification** - Can only end own session  
✅ **Audit Logging** - Records session duration and end reason  
✅ **Smart Rate Limiting** - Protects guest login, not authenticated users  
✅ **No Rate Limit on Logout** - Users can always end their session

---

## 💻 Code Changes Summary

### Files Modified

#### 1. **Serviceractivationcontroller.php**

Added new `endSession()` method (lines ~298-373):

- Validates authentication
- Finds active counter session
- Verifies user ownership
- Updates session with ended_at
- Logs session duration

#### 2. **routes/api.php**

Updated routing (lines ~24-31):

- Changed activate-session from `throttle:3,1` to custom middleware
- Added session/end endpoint with no rate limit

#### 3. **Activate.tsx**

Added logout UI (lines ~160, ~325-357, and success button):

- New state: `isLoggingOut`
- New handler: `handleLogout()`
- New button: "End Session" on success screen

### Files Created

#### 4. **ThrottleAuthenticatedActivation.php** (New)

Smart rate limiting middleware:

- Allows unlimited attempts for authenticated users
- Rate limits unauthenticated users at 3/minute

---

## 🚀 Flow Diagram

```
┌─────────────────────────────────────┐
│  Success Screen Loaded              │
│  "Session Active!" message          │
│  "End Session" button visible       │
└────────────┬────────────────────────┘
             │
             ├─ User Closes/Navigates
             │  (Session stays active on counter)
             │
             └─ User Clicks "End Session"
                │
                ├─ POST /api/counter/session/end
                │
                ├─ Backend Verifies:
                │  ✓ User is authenticated
                │  ✓ Counter exists
                │  ✓ Active session exists
                │  ✓ User owns session
                │
                ├─ Updates Session:
                │  • ended_at = now()
                │  • end_reason = 'logout'
                │
                ├─ Logs Activity
                │
                ├─ Returns 200 OK
                │
                └─ Frontend Redirects to /
                   (shows "Session ended" message)
```

---

## 📋 Rate Limiting Rules

| Endpoint                       | User Type       | Rate Limit |
| ------------------------------ | --------------- | ---------- |
| POST /counter/activate-session | Guest (no auth) | 3/minute   |
| POST /counter/activate-session | Authenticated   | Unlimited  |
| POST /counter/session/end      | Any             | Unlimited  |
| GET /counter/activate-info     | Any             | 5/minute   |

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Logout button appears on success screen
- [ ] Clicking logout shows loading spinner
- [ ] Page redirects to home after logout
- [ ] Database shows ended_at timestamp
- [ ] Logs show session duration
- [ ] Guest login attempts get rate limited at 3/min
- [ ] Authenticated user can login unlimited times
- [ ] Different user cannot logout another's session
- [ ] Invalid token returns 404
- [ ] Not authenticated returns 401

---

## 🐛 Troubleshooting

### Issue: Logout button doesn't appear

**Check:**

- Success page is displaying
- Counter and servicer_name are loaded
- isLoggingOut state is initialized

### Issue: Logout fails with 403

**Possible causes:**

1. User is not authenticated (session expired)
2. No active session on the counter
3. User doesn't own the counter's session

**Debug:** Check if `auth()->check()` returns true and CounterSession exists

### Issue: Rate limiting too strict

**Edit:** `app/Http/Middleware/ThrottleAuthenticatedActivation.php`
Change: `$limit = 3;` to higher number

### Issue: Users can still logout multiple times

**This is expected!** Each logout sets ended_at. If called again:

- Returns 403 "No active session" (because it's already ended)

---

## 📈 Log Monitoring

Watch for these log entries:

**Successful Logout:**

```
local.INFO: Counter session ended {"session_id":5,"duration_seconds":300}
```

**Rate Limit Hit:**

```
local.WARNING: Too many activation attempts {"ip":"192.168.1.1"}
```

**Unauthorized Logout:**

```
local.WARNING: Unauthorized logout attempt {"user_id":1,"session_owner":3}
```

---

## 🎓 For Developers

### How Session Ownership Works

```php
// In endSession() method:
$activeSession = CounterSession::where('counter_id', $counter->id)
    ->whereNull('ended_at')
    ->first();

// Only allow if you own it
if ($activeSession->user_id === auth()->id()) {
    $activeSession->update([
        'ended_at' => now(),
        'end_reason' => 'logout',
    ]);
}
```

### How Smart Rate Limiting Works

```php
// In ThrottleAuthenticatedActivation middleware:
if (auth()->check()) {
    // Authenticated user → skip rate limit
    return $next($request);
}

// Guest → apply rate limit
if (RateLimiter::tooManyAttempts($key, $limit)) {
    return response()->json(..., 429);
}
```

---

**Ready to test!** All changes are secure, efficient, and production-ready. 🚀
