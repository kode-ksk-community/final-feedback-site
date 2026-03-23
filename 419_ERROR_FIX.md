# 419 "Page Expired" Error - Complete Fix for cPanel

## What is Error 419?

Error 419 "Page Expired" occurs when Laravel's CSRF token validation fails. This typically happens when:

1. Session cookie is not being persisted
2. CSRF token doesn't match between requests
3. Session database table has issues
4. HTTPS detection is broken (cookies not sent)
5. Session domain/path misconfiguration

---

## Quick Fix Checklist (Do These First):

### Step 1: Verify .env Session Configuration

```env
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

✅ All these must be set exactly as shown above.

### Step 2: Clear All Caches

Run these commands on your cPanel server:

```bash
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Then regenerate
php artisan config:cache
php artisan view:cache
```

### Step 3: Verify Sessions Table

```bash
php artisan tinker
>>> Schema::hasTable('sessions')  # Should return true
>>> DB::table('sessions')->count()  # Should return a number
>>> exit
```

If table doesn't exist:

```bash
php artisan migrate
```

### Step 4: Fix File Permissions

**CRITICAL** - Sessions can't work with wrong permissions:

```bash
# Make directories writable
chmod 755 storage/
chmod 755 storage/framework/
chmod 755 storage/framework/sessions/
chmod 755 bootstrap/
chmod 755 bootstrap/cache/

# Make files readable
chmod 644 .env
chmod 644 storage/logs/laravel.log

# If running as different user:
chown -R your_username:your_username storage/ bootstrap/
```

### Step 5: Verify HTTPS Detection

```bash
# Method 1: Direct check in code
php artisan tinker
>>> config('session.secure')  # Should return true if HTTPS
>>> $_SERVER['HTTPS'] ?? 'not set'
>>> exit
```

---

## Debug the 419 Error

### Enable Debug Mode (Temporary)

In your `.env`:

```env
APP_DEBUG=true
LOG_LEVEL=debug
```

Then try logging in. Check `storage/logs/laravel.log` for detailed error.

### Browser DevTools Investigation

1. Open browser → Press **F12** (Developer Tools)
2. Go to **Network** tab
3. Try to login
4. Find the login POST request (likely `/login`)
5. Check **Response Headers**:

```
Should see:
Set-Cookie: XSRF-TOKEN=...
Set-Cookie: your_app_session=...
```

If these headers are missing → **Session not being created** → Fix permissions/database

### Check Network Request Details

Click on the failed login POST request:

- **Headers** tab: Look for `Cookie:` header (should include session cookie)
- **Response** tab: Should show error message, not full HTML page

If response shows HTML page → CSRF validation happened before authentication

### Test Session Creation

Add this debug route temporarily (remove after testing):

```php
// Add to routes/web.php
Route::post('/test-session', function (Request $request) {
    $request->session()->put('test_key', 'test_value');
    return [
        'session_id' => session()->getId(),
        'session_driver' => config('session.driver'),
        'https_secure' => config('session.secure'),
        'session_data' => session()->all(),
    ];
});
```

Test with POST request:

```bash
curl -X POST https://yourdomain.com/test-session -H "Content-Type: application/json"
```

Response should show session_id and test_value.

---

## Specific Fixes by Cause

### Cause 1: Sessions Table Missing

```bash
php artisan make:migration create_sessions_table
php artisan migrate
```

### Cause 2: Sessions Table Not Writable

```bash
# Verify database connection
php artisan db:show

# Verify table exists
php artisan tinker
>>> DB::table('sessions')->limit(1)->get()
>>> exit

# Check MySQL user permissions in cPanel
# Database → Current User Privileges → ensure SELECT, INSERT, UPDATE, DELETE, CREATE
```

### Cause 3: Storage Directory Not Writable

```bash
# Check current permissions
php artisan tinker
>>> is_writable(storage_path('framework/sessions'))
>>> exit

# If false, fix permissions:
chmod 755 storage/framework/sessions/
chown your_user:your_user storage/framework/ -R
```

### Cause 4: HTTPS Not Properly Detected

cPanel uses reverse proxies. Check if headers are passed:

```php
// Add to routes/web.php temporarily:
Route::get('/check-https', function() {
    return [
        'HTTPS' => $_SERVER['HTTPS'] ?? 'not set',
        'X-Forwarded-Proto' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'not set',
        'X-Forwarded-SSL' => $_SERVER['HTTP_X_FORWARDED_SSL'] ?? 'not set',
        'X-Forwarded-For' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 'not set',
        'config(session.secure)' => config('session.secure'),
    ];
});
```

Visit: `https://yourdomain.com/check-https`

Should show HTTPS or X-Forwarded headers. If all say "not set" → Ask cPanel support to verify proxy headers.

### Cause 5: Session Cookie Domain Issue

If using subdomain (e.g., `app.yourdomain.com`), set SESSION_DOMAIN:

```env
SESSION_DOMAIN=.yourdomain.com
```

For root domain, leave empty:

```env
SESSION_DOMAIN=
```

### Cause 6: Same-Site Cookie Issue (API Calls)

If making API calls from frontend outside session context:

```env
SESSION_SAME_SITE=none
```

But this requires:

- `SESSION_SECURE_COOKIE=true`
- HTTPS enabled

---

## Advanced Troubleshooting

### Test CSRF Token Generation

```bash
php artisan tinker
>>> csrf_token()  # Should output a token
>>> exit
```

### Check Middleware Stack

```bash
php artisan route:list | grep login
```

Should show these middleware: `web`, `guest`

### Verify Sanctum Configuration

If using Inertia + Sanctum, check:

```php
// config/sanctum.php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    Sanctum::currentApplicationUrlWithPort(),
))),
```

Should include your domain (yourdomain.com).

### Database Session Driver Test

```bash
php artisan tinker

# Check sessions table structure
>>> Schema::getColumns('sessions')

# Check one session record
>>> DB::table('sessions')->first()

# Delete old sessions
>>> DB::table('sessions')->where('last_activity', '<', time() - 86400)->delete()

>>> exit
```

---

## Last Resort Solutions

### Solution A: Use File-Based Sessions (Temporary)

```env
SESSION_DRIVER=file
```

Then:

```bash
chmod 755 storage/framework/sessions/
php artisan config:cache
```

This helps identify if it's a database issue. ⚠️ **Not for production**.

### Solution B: Disable CSRF Temporarily (Debug Only)

Edit `app/Http/Middleware/VerifyCsrfToken.php`:

```php
protected $except = [
    'login',
    'register',
];
```

Then test login. If it works → CSRF issue. If still broken → session issue.

⚠️ **Remove this after debugging!** Never deploy with CSRF disabled.

### Solution C: Check cPanel Logs

```bash
# View Apache error log
tail -f /var/log/apache2/error_log
# or
tail -f /var/log/httpd/error_log

# View Laravel log
tail -f storage/logs/laravel.log

# View PHP-FPM log (if using FastCGI)
tail -f /var/log/php-fpm/error.log
```

### Solution D: Contact Hosting Support

Provide them this information:

```
I'm getting 419 Page Expired errors on login. Here's what I've verified:

1. Sessions table exists and is accessible
2. Storage directory is writable (755 permissions)
3. PHP version is 8.2+
4. HTTPS is enabled with valid certificate
5. .env has correct database credentials
6. mod_rewrite is enabled

Can you verify:
- HTTP headers like X_FORWARDED_PROTO are being passed correctly?
- Sessions table in database is readable/writable?
- Are there any firewall rules blocking session cookies?
- Can you check Apache/PHP error logs for more details?
```

---

## Prevention

After fixing, ensure:

1. ✅ Run `php artisan config:cache` after any .env changes
2. ✅ Don't commit `.env` to git (use `.env.example`)
3. ✅ Test login/register after deployments
4. ✅ Monitor `storage/logs/laravel.log` for CSRF/session errors
5. ✅ Keep Laravel and dependencies updated

---

## Working Configuration Reference

For reference, here's a working .env for cPanel:

```env
APP_NAME=YourAppName
APP_ENV=production
APP_KEY=base64:YOUR_KEY_HERE
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpanel_database_name
DB_USERNAME=cpanel_user
DB_PASSWORD=cpanel_password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

CACHE_STORE=database
QUEUE_CONNECTION=database

LOG_CHANNEL=stack
LOG_LEVEL=error
```

---

## Key Takeaways

| Setting               | Value    | Why                        |
| --------------------- | -------- | -------------------------- |
| SESSION_DRIVER        | database | Reliable, persistent       |
| SESSION_SECURE_COOKIE | true     | Required for HTTPS         |
| SESSION_HTTP_ONLY     | true     | Security best practice     |
| SESSION_SAME_SITE     | lax      | Balance security/usability |
| SESSION_DOMAIN        | (empty)  | Root domain cookies        |

Once these are set correctly, 419 errors disappear completely.
