# Admin User Setup Guide

This guide explains how to create and manage admin users in the Chit Fund Manager application.

## Default Admin Credentials

**Phone:** 9942891022
**Password:** admin123

## Quick Setup

### Option 1: Using npm Script (Recommended)

Create or verify the default admin user:

```bash
npm run create-admin
```

This will:
- Check if admin user exists with phone 9942891022
- Create the admin if not exists
- Verify admin role if already exists

### Option 2: Full Database Seed

To seed the entire database with sample data including the admin:

```bash
npm run seed
```

This will:
- Delete all existing data
- Create admin user (9942891022)
- Create 20 sample member users
- Create 3 sample chit groups with auctions and payments

**Warning:** This will delete all existing data!

## Admin Management Commands

### Create/Verify Default Admin

```bash
npm run create-admin
```

### List All Admins

```bash
npm run list-admins
```

### Make Existing User Admin

```bash
node backend/utils/createAdmin.js -u <phone_number>
```

Example:
```bash
node backend/utils/createAdmin.js -u 9942891022
```

### Show Help

```bash
node backend/utils/createAdmin.js -h
```

## Manual Admin Creation

You can also create an admin user using the API or MongoDB directly.

### Using MongoDB Shell

```javascript
use your_database_name

db.users.insertOne({
  name: "Admin User",
  phone: "9942891022",
  email: "admin@chitfund.com",
  password: "$2a$10$...", // Use bcrypt to hash 'admin123'
  role: "admin",
  language: "en",
  status: "active",
  permissions: {
    canViewAuctions: true,
    canViewStatements: true,
    canLogin: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Using API (Register Endpoint)

If you modify the register endpoint to allow admin creation:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "phone": "9942891022",
    "email": "admin@chitfund.com",
    "password": "admin123",
    "role": "admin"
  }'
```

**Note:** By default, the register endpoint creates only member users for security.

## Changing Admin Phone Number

### Update in Seeder

Edit `backend/utils/seeder.js`:

```javascript
const admin = await User.create({
  name: 'Admin User',
  phone: 'YOUR_PHONE_NUMBER', // Change here
  email: 'admin@chitfund.com',
  password: 'admin123',
  role: 'admin',
  language: 'en',
  status: 'active'
});
```

### Update in createAdmin Script

Edit `backend/utils/createAdmin.js`:

```javascript
const adminPhone = 'YOUR_PHONE_NUMBER'; // Change here
```

Then run:
```bash
npm run create-admin
```

## Changing Admin Password

### Using createAdmin Script

Modify the admin after creation using MongoDB:

```bash
# Login to MongoDB
mongo your_database_uri

# Update password (you'll need to hash it first)
use your_database_name
db.users.updateOne(
  { phone: "9942891022" },
  { $set: { password: "NEW_HASHED_PASSWORD" } }
)
```

### Through the Application

1. Login as admin
2. Go to profile settings
3. Change password through the UI

## Troubleshooting

### Admin Already Exists

If you see "Admin user already exists", the script will verify the role and show current details.

### Cannot Create Admin

Check:
- MongoDB connection string in `.env`
- Database is running
- No validation errors (phone must be 10 digits)

### Password Not Working

- Default password is: `admin123`
- Phone number must match exactly: `9942891022`
- No spaces or special characters in phone

### Multiple Admins

You can have multiple admin users. Use:

```bash
npm run list-admins
```

to see all admins.

## Security Best Practices

1. **Change Default Password**
   - Change the default password immediately after first login
   - Use a strong password (minimum 6 characters)

2. **Limit Admin Accounts**
   - Only create admin accounts for trusted users
   - Regularly review admin users

3. **Monitor Admin Activity**
   - Check audit logs for admin actions
   - Review admin login history

4. **Environment Variables**
   - Never commit passwords to git
   - Use environment variables for sensitive data

## Admin User Model

Admin users have the following properties:

```javascript
{
  name: String,           // Full name
  phone: String,          // 10-digit phone number (unique)
  email: String,          // Email address (optional)
  password: String,       // Hashed password
  role: 'admin',          // Role: 'admin' or 'member'
  language: String,       // 'en' or 'ta'
  status: String,         // 'active', 'suspended', 'inactive'
  permissions: {
    canViewAuctions: Boolean,
    canViewStatements: Boolean,
    canLogin: Boolean
  },
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run create-admin` | Create/verify admin (9942891022) |
| `npm run list-admins` | List all admin users |
| `npm run seed` | Full database seed (includes admin) |
| `node backend/utils/createAdmin.js -u <phone>` | Make user admin by phone |
| `node backend/utils/createAdmin.js -h` | Show help |

## Test Credentials

After seeding:

- **Admin:** 9942891022 / admin123
- **Members:** See seeder output for member credentials

---

**For more information, see the main README.md or contact the development team.**
