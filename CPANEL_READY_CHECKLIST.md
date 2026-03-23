# Pre-Deployment Checklist for cPanel

Your Laravel application is now fully prepared for cPanel deployment. Use this checklist to ensure everything is ready before pushing to production.

## ✅ Pre-Push to Git

- [ ] Review all modified files: `.env.example`, `config/session.php`, `public/.htaccess`, `.env.example`
- [ ] Verify `.env` file is NOT committed (should be in .gitignore)
- [ ] Check cPanel-specific documentation files are included:
    - [ ] `CPANEL_DEPLOYMENT_GUIDE.md`
    - [ ] `419_ERROR_FIX.md`
    - [ ] `419_FIX_SUMMARY.md`
    - [ ] `CPANEL_READY_CHECKLIST.md` (this file)

### Git Commands to Run

```bash
# View all pending changes
git status

# Commit all production-ready changes
git add .
git commit -m "cPanel deployment: Session config hardening, HTTPS proxy detection, .htaccess enhancement"

# Verify .env is NOT in git
git ls-files | grep ".env"  # Should return nothing

# Push to main branch
git push origin main
```

---

## ✅ Environment Configuration

Your `.env` file is configured for cPanel but contains placeholders. Before deploying:

### Current Placeholders (Replace on cPanel Server)

- [ ] `APP_URL=https://yourdomain.com` → Replace with your actual domain
- [ ] `DB_DATABASE=your_database_name` → Use cPanel database name
- [ ] `DB_USERNAME=your_database_user` → Use cPanel database user
- [ ] `DB_PASSWORD=your_database_password` → Use cPanel database password
- [ ] `SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com` → Replace domain

### Do NOT Change

- [ ] `SESSION_DRIVER=database` (required)
- [ ] `SESSION_SECURE_COOKIE=true` (required for HTTPS)
- [ ] `SESSION_HTTP_ONLY=true` (required for security)
- [ ] `SESSION_SAME_SITE=lax` (required for form submissions)
- [ ] `DB_CONNECTION=mysql` (use MySQL on cPanel)

---

## ✅ Database Preparation

### Before Uploading

- [ ] Create MySQL database in cPanel
- [ ] Create database user in cPanel
- [ ] Grant all privileges to database user

### After Uploading to cPanel

```bash
# SSH into your cPanel server, then:

# 1. Run migrations
php artisan migrate --force

# 2. (Optional) Seed sample data
php artisan db:seed --force

# 3. Verify tables were created
php artisan tinker
>>> DB::table('users')->count()  # Should return number of users
>>> exit
```

---

## ✅ File & Directory Permissions (Critical for Sessions)

After uploading files to cPanel, run these commands via SSH:

```bash
# From your public_html or project root directory:

# Make directories writable
chmod 755 storage
chmod 755 storage/framework
chmod 755 storage/framework/sessions
chmod 755 storage/framework/cache
chmod 755 storage/framework/views
chmod 755 storage/app
chmod 755 storage/logs
chmod 755 bootstrap
chmod 755 bootstrap/cache

# Make files readable
chmod 644 .env
chmod 644 composer.json
chmod 644 artisan
chmod 644 public/index.php

# Verify permissions
ls -la storage/framework/sessions/  # Should show drwxr-xr-x

# If using dedicated user (recommended):
chown -R cpanel_user:cpanel_group storage
chown -R cpanel_user:cpanel_group bootstrap
```

---

## ✅ Dependency Installation on cPanel

```bash
# SSH into cPanel server from private_html or project root:

# 1. Install PHP dependencies (no dev dependencies for production)
composer install --no-dev --optimize-autoloader --no-interaction

# 2. Install Node dependencies
npm install --no-save

# 3. Build frontend assets
npm run build

# Check build output
ls -la public/build/  # Should show manifest.json and assets
```

---

## ✅ Laravel Configuration Caching

```bash
# Run these commands on cPanel server:

# 1. Clear any development caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# 2. Generate production caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Verify caches were created
ls -la bootstrap/cache/  # Should show config.php, routes-*, views-*
```

---

## ✅ Storage Link Creation

```bash
# On cPanel server:
php artisan storage:link

# Verify symlink was created
ls -la public/storage  # Should show -> ../storage/app/public

# If symlink doesn't work on cPanel, use hardcopy instead:
# rm public/storage
# cp -r storage/app/public public/storage
```

---

## ✅ PHP Configuration on cPanel

Verify these settings in cPanel PHP Configuration (or contact support):

```php
; Minimum recommended
memory_limit = 256M
max_execution_time = 300
upload_max_filesize = 100M
post_max_size = 100M

; Verify these extensions are enabled
extension = mysqli.so         # Required
extension = pdo_mysql.so      # Required
extension = gd.so            # For image processing
extension = zip.so           # For file uploads

; Optional but recommended
extension = redis.so          # For caching (if available)
```

Check in cPanel → Select PHP Version → Extensions

---

## ✅ SSL Certificate

```bash
# In cPanel control panel:
1. Go to "Domains"
2. Find your domain
3. Click "Manage"
4. Look for "SSL/TLS" or "Install SSL"
5. Click "Manage AutoSSL" or request manual SSL

# On server, verify HTTPS works:
curl -I https://yourdomain.com
# Should return 200 OK

# If using subdomains (e.g., app.yourdomain.com):
# Ensure wildcard SSL or SAN certificate includes all subdomains
```

---

## ✅ HTTPS Redirect (cPanel AutoRedirect)

In cPanel control panel:

1. Domain Manager → Your Domain → Manage
2. Find "Force HTTPS Redirect" option
3. Enable it (should auto-redirect http:// to https://)

Or in `.htaccess` it's already configured:

```apache
RewriteEngine On
# This in public/.htaccess ensures all traffic goes to index.php
```

---

## ✅ Testing on cPanel (First-Time Access)

After deployment, test these flows:

### Test 1: Access Homepage

```
https://yourdomain.com
Should load without errors, no 500 error
```

### Test 2: Access Login Page

```
https://yourdomain.com/login
Should load login form (no 419 error)
```

### Test 3: Test Login

```
1. Enter valid email/password
2. Click login
3. Should redirect to dashboard (not get 419 error)
```

### Test 4: Check Session

```
After login:
1. Open DevTools (F12) → Network tab
2. Reload page (F5)
3. Check Request Headers: should have "Cookie: ..." header with session ID
```

### Test 5: Check Logs

```bash
# If anything fails, check logs:
tail -f storage/logs/laravel.log

# Check for session or CSRF errors
grep -i "csrf\|session\|419" storage/logs/laravel.log
```

---

## ✅ If You Get 419 "Page Expired" Error

**This is the most common cPanel issue.** Follow troubleshooting in `419_ERROR_FIX.md`:

```bash
# 1. Verify sessions table exists
php artisan tinker
>>> DB::table('sessions')->count()
>>> exit

# 2. Check if storage directory is writable
touch storage/test.txt && rm storage/test.txt

# 3. View detailed error
tail -f storage/logs/laravel.log

# 4. Check session/cookie detection
Visit https://yourdomain.com/debug-session  # Add route in web.php temporarily
```

See `419_ERROR_FIX.md` for complete debugging guide.

---

## ✅ Key Files Modified

| File                 | Changes                                                           | Status |
| -------------------- | ----------------------------------------------------------------- | ------ |
| `.env.example`       | Added SESSION_SECURE_COOKIE, SESSION_HTTP_ONLY, SESSION_SAME_SITE | ✅     |
| `config/session.php` | Enhanced HTTPS detection for cPanel reverse proxies               | ✅     |
| `public/.htaccess`   | Added PHP version directive for cPanel                            | ✅     |
| `bootstrap/app.php`  | Added trustProxies(\*) for HTTPS detection                        | ✅     |
| `.env`               | Configured for production MySQL + sessions                        | ✅     |

---

## ✅ Security Checklist

Before going live:

- [ ] `APP_DEBUG=false` in .env
- [ ] `APP_ENV=production` in .env
- [ ] `.env` file is NOT in git repository
- [ ] `APP_KEY` is set (unique, not placeholder)
- [ ] `SANCTUM_STATEFUL_DOMAINS` includes your domain
- [ ] SSL certificate installed and enabled
- [ ] Database password is strong
- [ ] Storage/bootstrap directories have correct permissions (755)
- [ ] Regular backups scheduled in cPanel

---

## ✅ Deployment Summary

### What Was Fixed for cPanel

1. **Session Configuration** - Added secure cookie settings
2. **HTTPS Detection** - Enhanced to work behind cPanel reverse proxy
3. **Database Sessions** - Configured database driver for session persistence
4. **CSRF Protection** - Proper same-site cookie configuration
5. **Storage Link** - Created for file uploads
6. **Configuration Caching** - Production-optimized
7. **.htaccess** - Enhanced for cPanel PHP compatibility

### What You Need to Do

1. **Git Push** - Commit and push all changes
2. **Upload to cPanel** - All files via FTP/SSH (except .env, storage/, vendor/)
3. **Create .env on Server** - Copy from .env.example, fill in database credentials
4. **Run Migrations** - `php artisan migrate --force`
5. **Install Dependencies** - `composer install --no-dev`, `npm run build`
6. **Cache Configuration** - `php artisan config:cache`
7. **Test Login** - Verify no 419 errors
8. **Monitor Logs** - Check storage/logs/laravel.log

---

## ✅ Important Notes

- **Never commit .env file** - It's in .gitignore for security
- **Staging first** - Consider testing on staging domain before main domain
- **Database backup** - cPanel has backup tools; configure automatic backups
- **Monitor logs** - Watch storage/logs/laravel.log after deployment
- **Clear caches regularly** - `php artisan cache:clear` if needed

---

## ✅ Quick Reference Commands

```bash
# After uploading files to cPanel:

# Setup
php artisan migrate --force
composer install --no-dev --optimize-autoloader
npm install && npm run build

# Cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Storage
php artisan storage:link

# Test
php artisan about
php artisan tinker  # exit with Ctrl+D

# Monitor
tail -f storage/logs/laravel.log
```

---

## Support Resources

- **419 Error Issues**: See `419_ERROR_FIX.md` for complete troubleshooting
- **Deployment Steps**: See `CPANEL_DEPLOYMENT_GUIDE.md` for detailed guide
- **cPanel Help**: Check cPanel documentation or contact hosting support
- **Laravel Docs**: https://laravel.com/docs/12

---

**Status**: ✅ Application is ready for cPanel deployment

**Last Updated**: March 23, 2026

**Next Steps**:

1. Review this checklist
2. Commit and push to git
3. Follow steps to deploy to cPanel
4. Monitor logs after going live
