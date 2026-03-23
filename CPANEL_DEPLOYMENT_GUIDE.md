# cPanel Deployment Guide

## Critical Issues Fixed:

1. ✅ Created missing storage symlink
2. ✅ Updated .env for production settings
3. ✅ Cached configuration
4. ✅ Added PHP version directive to .htaccess
5. ✅ **Fixed 419 Page Expired error on login** (Session + CSRF configuration)

---

## 🚨 CRITICAL: 419 "Page Expired" Error on Login/Register (MOST COMMON cPanel ISSUE)

### Root Causes:

- Session cookies not properly marked as secure for HTTPS
- Session domain mismatch between frontend and backend
- CSRF token expiration due to session issues
- HTTPS not detected properly behind cPanel proxy

### Solution Applied:

Your .env now has these CRITICAL settings:

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

**KEY SETTINGS:**

- `SESSION_SECURE_COOKIE=true` - Forces cookies over HTTPS only (required for cPanel)
- `SESSION_HTTP_ONLY=true` - Prevents JavaScript access to session cookies
- `SESSION_SAME_SITE=lax` - Allows same-site cookie submissions (fixes CSRF)
- `SESSION_DOMAIN=` - Leave empty (not a subdomain-specific cookie)

The session.php config has also been updated with intelligent HTTPS detection for cPanel reverse proxies.

### What You Must Do on cPanel Server:

1. **Verify HTTPS is Working:**

    ```bash
    # Check if HTTPS is being detected
    php artisan tinker
    >>> env('APP_URL')
    >>> config('session.secure')
    ```

2. **Clear All Caches:**

    ```bash
    php artisan cache:clear
    php artisan config:clear
    php artisan config:cache
    php artisan SESSION:table  # If sessions table doesn't exist
    php artisan migrate
    ```

3. **Test Login:**
    - Open browser DevTools → Network tab
    - Login attempt → check the POST request
    - Look for `Set-Cookie:` header with session ID
    - If missing, check session table is writable

---

## Required Manual Steps for cPanel:

### 1. Database Migration (SQLite to MySQL)

Since cPanel prefers MySQL over SQLite, you need to migrate your data:

```bash
# Update .env with MySQL credentials from cPanel
# Then run:
php artisan migrate
php artisan db:seed
```

### 2. File Permissions

Set these permissions on cPanel ⚠️ **Critical for sessions to work**:

- `storage/` directory: **755** (must be writable)
- `storage/framework/` subdirectories: **755**
- `storage/framework/sessions/` directory: **755** ✅
- `bootstrap/cache/` directory: **755**
- `.env` file: **644**
- All other files: **644**

```bash
# Commands to run on cPanel:
find storage bootstrap -type d -exec chmod 755 {} \;
find storage bootstrap -type f -exec chmod 644 {} \;
chmod 644 .env
```

### 3. Update .env file on cPanel Server

Replace these placeholders:

```env
APP_URL=https://yourdomain.com
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_cpanel_database_name
DB_USERNAME=your_cpanel_db_user
DB_PASSWORD=your_cpanel_db_password
```

**DO NOT change SESSION\_\* variables after uploading.**

### 4. cPanel Specific Settings

In cPanel control panel:

- ✅ Ensure PHP version is **8.2 or higher**
- ✅ Enable **mod_rewrite** (required for Laravel routing)
- ✅ Set **memory_limit** to at least **256M**
- ✅ Set **max_execution_time** to at least **300**
- ✅ Ensure **SSL certificate is installed and active**

Check in cPanel → Select PHP Version → or contact hosting provider.

### 5. Upload Files (Recommended Method)

Upload all files EXCEPT:

- `.env` (create new one on server with credentials)
- `storage/` (create empty directories)
- `vendor/` (run `composer install` on server)
- `node_modules/` (run `npm install` on server)
- `bootstrap/cache/config.php` (will be regenerated)

### 6. Post-Upload Commands (Run on cPanel Terminal/SSH)

```bash
# From your project root
cd public_html  # or wherever you uploaded

# Install dependencies
composer install --no-dev --optimize-autoloader
npm install
npm run build

# Setup Laravel
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Database
php artisan migrate --force
php artisan db:seed --force
```

### 7. Verify SSL Certificate

Ensure SSL is enabled on your domain:

- cPanel → Domains → select domain → check "Force HTTPS Redirect"
- Or use AutoSSL in cPanel to generate free SSL certificate

### 8. Verify Setup

Test the application:

```bash
# Check if everything is ready
php artisan optimize
php artisan about

# Try a test login (use registered user or seed)
# If you get 419 error → scroll to troubleshooting section below
```

---

## Troubleshooting 419 "Page Expired" Error

### Checklist:

1. **Sessions Table Exists?**

    ```bash
    php artisan tinker
    >>> DB::table('sessions')->count()
    >>> exit
    ```

    If table doesn't exist: `php artisan migrate`

2. **Sessions Directory Writable?**

    ```bash
    # On server
    touch storage/framework/sessions/test.txt
    rm storage/framework/sessions/test.txt
    ```

    If fails → fix permissions above

3. **Database Connection Working?**

    ```bash
    php artisan db:show
    ```

    If error → fix DB credentials in .env

4. **HTTPS Being Detected?**
    ```bash
    # In browser console after visiting site
    fetch('/api/user', { credentials: 'include' }).then(r => console.log(r.status))
    ```
    If CSRF error → HTTPS not detected (see below)

### If Still Getting 419:

**Option A: Check HTTPS Detection**

```php
// Add this temporarily to routes/web.php for debugging:
Route::get('/debug-session', function() {
    return [
        'https_detected' => config('session.secure'),
        'server_https' => $_SERVER['HTTPS'] ?? 'not set',
        'forwarded_proto' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'not set',
        'session_driver' => config('session.driver'),
        'csrf_token' => csrf_token(),
    ];
});
// Visit https://yourdomain.com/debug-session
// Remove this route after checking!
```

**Option B: Fallback - Use File Sessions** (Temporary workaround)

```env
SESSION_DRIVER=file
```

Then: `php artisan config:cache`

(This is less secure but helps diagnose if it's a database issue)

**Option C: Contact Hosting Support**
Ask cPanel support:

- "Is mod_rewrite enabled?"
- "Are HTTP headers like X_FORWARDED_PROTO set correctly?"
- "Can we verify HTTPS is enabled with proper certificates?"

---

## Common cPanel Issues & Solutions:

| Issue                                          | Solution                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| **500 Internal Server Error**                  | Check file permissions, .env file exists, storage directory writable       |
| **419 Page Expired (LOGIN)**                   | Follow troubleshooting section above - most likely session/CSRF issue      |
| **Login form appears but submit doesn't work** | Sessions table missing or database not configured correctly                |
| **Asset loading fails (CSS/JS)**               | Run `php artisan storage:link` and ensure public/storage symlink exists    |
| **Database connection error**                  | Verify DB credentials in .env match cPanel database setup                  |
| **Blank white page**                           | Check storage/logs/laravel.log for errors; ensure storage/logs is writable |

---

## cPanel PHP Configuration Check

If you have control panel access, verify these settings:

```php
; Recommended for Laravel on cPanel
memory_limit = 256M
max_execution_time = 300
upload_max_filesize = 100M
post_max_size = 100M
extension = mysqli.so
extension = pdo_mysql.so
```

Ask hosting provider to enable these if needed.

---

## Final Verification Checklist

- [ ] Database migrations completed (`php artisan migrate`)
- [ ] File permissions set (storage/bootstrap = 755, others = 644)
- [ ] .env file exists on server with real database credentials
- [ ] Storage link created (`php artisan storage:link`)
- [ ] Config cached (`php artisan config:cache`)
- [ ] SSL certificate installed and working
- [ ] Can access login page (no 500 error)
- [ ] Can submit login form (no 419 error)
- [ ] Session created after successful login
- [ ] Can access authenticated pages

---

## Need More Help?

If issues persist:

1. Check `storage/logs/laravel.log` for detailed errors
2. Enable debug mode temporarily: `APP_DEBUG=true` in .env
3. Run `php artisan about` to verify configuration
4. Contact cPanel hosting support with these details

</content>
  <parameter name="filePath">d:\github\kode-ksk-community\final-feedback-site\CPANEL_DEPLOYMENT_GUIDE.md
