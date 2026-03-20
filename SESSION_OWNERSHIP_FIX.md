# Session Ownership Fix - Test Guide

## Problem Fixed

When a servicer refreshed the page after successfully logging into a counter, they would see "Counter Occupied" instead of their active session.

## Solution Implemented

Updated the `info` endpoint to check if the currently logged-in user is the **owner** of the counter's active session. If they are, the counter is shown as available to them.

## Changes Made

### Backend (Laravel)

**File:** `app/Http/Controllers/Client/Serviceractivationcontroller.php`

Updated the `info()` method to:

1. Check if counter is occupied
2. If yes and user is authenticated, fetch the active session with user relationship
3. Check if current user is the session owner
4. If yes, return 200 with counter info + `session_owner: true` + `servicer_name`
5. If no, return 409 (occupied by someone else)

### Frontend (React)

**File:** `resources/js/pages/client/counter/Activate.tsx`

Updated the useEffect to:

1. Check the info response for `session_owner` flag
2. If `session_owner: true`, skip auto-activate and go directly to success screen
3. Use the `servicer_name` provided in the response

---

## 🧪 Testing Steps

### Test 1: Session Persistence (Main Fix)

1. Start as logged-in servicer
2. Navigate to `/counter/activate?counter_token=<valid_token>`
3. Successfully activate the counter → success screen
4. **Refresh the page** (F5 or Ctrl+R)
5. **Expected:** Success screen appears immediately (NOT "Counter Occupied")
6. **Expected in logs:** `session_owner: true` in the response

### Test 2: Different User Gets Occupied Message

1. Log in as **Servicer A**
2. Activate Counter 1 → success
3. Log out
4. Log in as **Servicer B** (same branch)
5. Navigate to Counter 1's activation URL
6. **Expected:** "Counter Occupied" message with list of idle counters

### Test 3: Timeout Resets (Edge Case)

1. Log in and activate counter
2. Wait for session to timeout
3. Refresh the page
4. **Expected:** Show "Counter Occupied" or login form (session is no longer valid)

---

## 📊 Expected Database State

After fix:

```
CounterSession {
  id: 1,
  counter_id: 1,
  user_id: 5 (Servicer A),
  started_at: "2026-03-20 12:00:00",
  ended_at: null
}
```

When Servicer A refreshes:

- `info()` checks: Counter 1 has active session
- Fetches session: `user_id = 5`
- Checks current auth: `auth()->id() = 5`
- Match! Returns: `session_owner: true` with status 200
- Frontend shows success screen

---

## 🔍 Verification Checklist

- [ ] Test 1: servicer can refresh after login and see success
- [ ] Test 2: different servicer sees "Counter Occupied"
- [ ] Logs show `session_owner: true` in info response
- [ ] Success screen displays correct servicer name
- [ ] Counter info displays correctly
- [ ] No errors in browser console

---

## 🐛 Troubleshooting

### Issue: Still shows "Counter Occupied" after refresh

**Check:**

1. User is authenticated (has Laravel session)
2. CounterSession exists for that counter
3. CounterSession.user_id matches auth()->id()

**Debug:**

```bash
# Check Laravel logs
tail storage/logs/laravel.log

# Test the API directly
curl http://localhost/api/counter/activate-info?counter_token=<token>
# Should return { "session_owner": true, "servicer_name": "..." }
```

### Issue: API response doesn't include servicer_name

**Check:**

1. User relationship is loaded: `->with('user')`
2. User model has `name` field
3. Session's user_id is not null

---

## 📝 API Response Examples

### Case 1: User Owns Session (After Fix)

```json
{
    "counter": {
        "id": 1,
        "name": "Counter A",
        "branch_name": "Main Branch",
        "branch_id": 1
    },
    "session_owner": true,
    "servicer_name": "Sophea"
}
```

**Status:** 200 OK

### Case 2: Someone Else Using Counter

```json
{
    "message": "Counter A is currently occupied.",
    "idle_counters": [
        {
            "id": 2,
            "name": "Counter B",
            "description": null,
            "device_token": "..."
        }
    ]
}
```

**Status:** 409 Conflict

### Case 3: Counter Not Occupied

```json
{
    "counter": {
        "id": 1,
        "name": "Counter A",
        "branch_name": "Main Branch",
        "branch_id": 1
    }
}
```

**Status:** 200 OK

---

## ✅ Completion Checklist

- [x] Backend: Check session ownership in info() endpoint
- [x] Backend: Return servicer_name when owner
- [x] Frontend: Handle session_owner flag
- [x] Frontend: Skip auto-activate if session_owner is true
- [x] Documentation: Created this test guide

**Ready to test!** 🚀
