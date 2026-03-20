# Installation & Setup Guide

## Prerequisites

- PHP 8.2 or higher
- Node.js 18+ and npm
- SQLite, MySQL, or PostgreSQL
- Composer
- Git

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd final-feedback-site
```

### 2. Install PHP Dependencies
```bash
composer install
```

### 3. Install Node.js Dependencies
```bash
npm install
```

### 4. Setup Environment
```bash
# Copy the example environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### 5. Configure Database

#### Option A: SQLite (Default - Already Configured)
The `.env` already has SQLite configured:
```env
DB_CONNECTION=sqlite
```

The `database/database.sqlite` file is already created.

#### Option B: MySQL
Edit `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=feedback_site
DB_USERNAME=root
DB_PASSWORD=your_password
```

Then create the database:
```bash
mysql -u root -p -e "CREATE DATABASE feedback_site;"
```

### 6. Run Database Migrations
```bash
php artisan migrate

# If you need to start fresh:
php artisan migrate:fresh --seed
```

### 7. Build Frontend Assets
```bash
npm run build

# Or for development with watch mode:
npm run dev
```

### 8. Start Development Servers

#### Option A: Using the combined dev command (Recommended)
```bash
composer dev
```
This runs Laravel server, queue listener, and Vite dev server concurrently.

#### Option B: Individual servers
Terminal 1 - Laravel server:
```bash
php artisan serve
```

Terminal 2 - Queue listener:
```bash
php artisan queue:listen --tries=1
```

Terminal 3 - Vite development server:
```bash
npm run dev
```

### 9. Access the Application
- Application URL: `http://localhost:8000`
- Admin Dashboard: `http://localhost:8000/admin/dashboard`

## Running Tests

```bash
# Run all tests
php artisan test

# Run specific test file
php artisan test tests/Feature/Auth/RegistrationTest.php

# Run with coverage
php artisan test --coverage

# Run tests in parallel
php artisan test --parallel
```

## Code Quality & Formatting

```bash
# Fix ESLint issues
npm run lint

# Format code with Prettier
npm run format

# Check format without fixing
npm run format:check

# Fix PHP code style with Pint
php artisan pint
```

## Environment Variables

Key environment variables to configure:

```env
# Application
APP_NAME=Laravel
APP_ENV=local|production
APP_DEBUG=true|false
APP_KEY=base64:xxxxx

# Database
DB_CONNECTION=sqlite|mysql|pgsql
DB_DATABASE=path_or_name
DB_USERNAME=user (if not SQLite)
DB_PASSWORD=password (if not SQLite)

# Session
SESSION_DRIVER=database|cookie|file
SESSION_LIFETIME=120

# Queue
QUEUE_CONNECTION=database|redis|sync

# Cache
CACHE_STORE=database|redis|file

# Mail (for password reset emails)
MAIL_DRIVER=log|smtp|mailgun
MAIL_FROM_ADDRESS=noreply@feedback-system.test
```

## Database Migrations

View available migrations:
```bash
php artisan migrate:status
```

Run specific migration:
```bash
php artisan migrate --path=/path/to/migration
```

Rollback last migration:
```bash
php artisan migrate:rollback
```

Rollback all migrations:
```bash
php artisan migrate:reset
```

Rollback and re-run:
```bash
php artisan migrate:refresh
```

## Useful Artisan Commands

```bash
# Clear application cache
php artisan cache:clear

# Clear all caches
php artisan cache:clear && php artisan config:clear && php artisan route:clear

# Create a new migration
php artisan make:migration create_table_name

# Create a new model with migration
php artisan make:model ModelName -m

# Create a new controller
php artisan make:controller ControllerName

# Tinker REPL
php artisan tinker

# View all routes
php artisan route:list
```

## Production Deployment

### 1. Environment Setup
```bash
# Create .env for production
cp .env.example .env.production

# Generate production key
php artisan key:generate --env=production
```

### 2. install with no dev dependencies
```bash
composer install --no-dev --optimize-autoloader
npm ci --only=production
```

### 3. Build Assets
```bash
npm run build
```

### 4. Database Setup
```bash
# Run migrations on production
php artisan migrate --force
```

### 5. Optimize Application
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 6. Setup Web Server

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/final-feedback-site/public;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    index index.php index.html index.htm;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

#### Apache Configuration
Enable mod_rewrite and configure:
```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews
    </IfModule>

    RewriteEngine On

    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [QSA,L]
</IfModule>
```

### 7. File Permissions
```bash
chmod -R 755 storage bootstrap/cache public
chmod -R 777 storage bootstrap/cache
chown -R www-data:www-data /path/to/final-feedback-site
```

### 8. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

## Troubleshooting

### Problem: "Vite manifest not found"
**Solution**: Run `npm run build`

### Problem: Database connection error
**Solution**: 
- Verify DB credentials in `.env`
- Ensure database exists
- Run `php artisan migrate`

### Problem: Permission denied on storage/
**Solution**:
```bash
chmod -R 755 storage bootstrap/cache
chmod -R 777 storage bootstrap/cache
```

### Problem: Tests failing
**Solution**:
- Ensure migrations are up to date: `php artisan migrate`
- Clear test cache: `php artisan cache:clear`
- Run with: `php artisan test --env=testing`

## Support & Documentation

- Laravel Docs: https://laravel.com/docs
- Inertia.js Docs: https://inertiajs.com
- React Docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Radix UI: https://www.radix-ui.com

---

**Last Updated**: March 20, 2026
**Laravel Version**: 12.55.0
**React Version**: 19.0.3
