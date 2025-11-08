# HSA Vault Backend API

HIPAA-compliant backend API for HSA receipt management with OCR capabilities.

## Features

- ✅ User authentication (JWT)
- ✅ Receipt upload with OCR processing
- ✅ Image compression and S3 storage
- ✅ Receipt CRUD operations
- ✅ Statistics and analytics
- ✅ HIPAA-compliant architecture
- ✅ Rate limiting and security middleware

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- AWS Account (for S3 storage)
- npm or yarn

## Installation

1. **Clone and install dependencies:**
```bash
cd hsa-vault-backend
npm install
```

2. **Set up PostgreSQL database:**
```bash
createdb hsavault
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run database migrations:**
```bash
npm run migrate
```

5. **Start the server:**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## Environment Variables

See `.env.example` for all required variables:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `S3_BUCKET_NAME` - S3 bucket for receipt images
- `CORS_ORIGIN` - Allowed CORS origin (your frontend URL)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Receipts

- `GET /api/receipts` - Get all receipts (with filters)
- `GET /api/receipts/:id` - Get single receipt
- `POST /api/receipts/upload` - Upload receipt with OCR
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt
- `GET /api/receipts/stats/summary` - Get receipt statistics

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Upload Receipt
```bash
curl -X POST http://localhost:3000/api/receipts/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/receipt.jpg" \
  -F "date=2025-01-15" \
  -F "vendor=CVS Pharmacy" \
  -F "service_type=Prescription" \
  -F "amount=45.99"
```

### Get Receipts
```bash
curl -X GET "http://localhost:3000/api/receipts?year=2025&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure

```
hsa-vault-backend/
├── config/
│   └── database.js          # PostgreSQL connection
├── middleware/
│   ├── auth.js             # JWT authentication
│   └── errorHandler.js     # Error handling
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── receipts.js         # Receipt routes
│   └── users.js            # User routes
├── services/
│   ├── s3.js               # AWS S3 operations
│   ├── ocr.js              # OCR processing
│   └── imageProcessing.js  # Image compression
├── validators/
│   ├── auth.js             # Auth validation schemas
│   └── receipt.js         # Receipt validation schemas
├── migrations/
│   ├── schema.sql          # Database schema
│   └── migrate.js          # Migration runner
├── server.js               # Express app entry point
├── package.json
└── .env.example
```

## Security Features

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation (Joi)
- ✅ SQL injection prevention (parameterized queries)
- ✅ S3 encryption at rest

## HIPAA Compliance

- ✅ Encrypted database connections
- ✅ Encrypted S3 storage
- ✅ Audit logging
- ✅ Access controls
- ✅ Secure authentication

**Note:** Sign AWS BAA before storing any PHI in production.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run migrations
npm run migrate
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Enable SSL/TLS for database
4. Configure proper CORS origins
5. Set up monitoring and logging
6. Enable AWS CloudWatch
7. Set up automated backups

## Testing

```bash
# Run tests (when implemented)
npm test
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb hsavault`

### S3 Upload Issues
- Verify AWS credentials
- Check S3 bucket exists and permissions
- Ensure bucket is in correct region

### OCR Not Working
- Check Tesseract.js is installed
- Verify image format is supported
- Check image quality (OCR works better with clear images)

## License

ISC

