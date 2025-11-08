# Quick Start Guide

## 1. Install Dependencies

```bash
cd hsa-vault-backend
npm install
```

## 2. Set Up PostgreSQL

```bash
# Install PostgreSQL (if not installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# Create database
createdb hsavault

# Or using psql:
psql -U postgres
CREATE DATABASE hsavault;
\q
```

## 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hsavault
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# AWS (get from AWS Console)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=hsa-vault-receipts

# CORS
CORS_ORIGIN=http://localhost:8080
```

## 4. Set Up AWS S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket named `hsa-vault-receipts`
3. Enable encryption (SSE-S3)
4. Block public access
5. Enable versioning (optional)
6. Note your AWS credentials

## 5. Run Migrations

```bash
npm run migrate
```

## 6. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

## 7. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!@#"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

## Troubleshooting

**Database connection error:**
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Check database exists: `psql -l | grep hsavault`

**S3 upload error:**
- Verify AWS credentials
- Check bucket exists and is in correct region
- Verify IAM permissions for S3

**Port already in use:**
- Change PORT in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

