# Mi-ze (מי-זה) - Masked Singer Voting App

A Hebrew (RTL) web application for a Cloudinary internal "Masked Singer" contest.

## Features

### Public Users
- Enter display name (stored locally)
- Browse contenders in a swipeable carousel
- Watch contender videos (Cloudinary Video Player)
- Give "Love it" (one per contender per device)
- Submit "Guess who?" (unlimited guesses)
- Vote during active voting cycles (one vote per cycle per device)

### Admin
- Manage contenders (create/edit/delete, active/inactive)
- Manage voting cycles (create, prevent overlaps, close manually)
- View stats (love counts, guesses, votes with drill-down to names)

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL + Prisma
- **Media**: Cloudinary
- **Hosting**: Railway

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/mize)

### Manual Railway Deployment

1. **Create a new project** on [Railway](https://railway.app)

2. **Add a PostgreSQL database**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set the `DATABASE_URL`

3. **Deploy from GitHub**:
   - Click "New" → "GitHub Repo"
   - Select the `mize` repository
   - Railway will auto-detect the configuration

4. **Set environment variables** in Railway dashboard:
   ```
   NODE_ENV=production
   ADMIN_PASSWORD=your-secure-admin-password
   SESSION_SECRET=your-random-session-secret
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   ```

5. **Run database migration** (one-time):
   - Go to your service → Settings → Deploy
   - Click "Redeploy" after adding the PostgreSQL database

The app will be available at your Railway-provided URL.

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Cloudinary account

### Environment Variables

Create `.env` file in the `server` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mize"
ADMIN_PASSWORD="your-secure-admin-password"
SESSION_SECRET="your-session-secret"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Run development servers
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

## Project Structure

```
mize/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # Zustand state
│   │   ├── api/               # API client
│   │   └── utils/             # Fingerprint, helpers
│   └── index.html
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── middleware/        # Auth, device token
│   │   ├── controllers/       # Business logic
│   │   ├── services/          # Fingerprint hashing
│   │   └── index.ts           # Entry point
│   └── prisma/
│       └── schema.prisma      # Database schema
└── package.json               # Workspace root
```

## API Endpoints

### Public
- `GET /api/config` - Active cycle info
- `GET /api/contenders` - All contenders with love counts
- `POST /api/contenders/:id/love` - Add love
- `POST /api/contenders/:id/guess` - Submit guess
- `GET /api/vote` - Check if user voted
- `POST /api/vote` - Submit vote

### Admin
- `POST /api/admin/login` - Admin login
- `GET/POST/PUT/DELETE /api/admin/contenders` - Contender management
- `GET/POST /api/admin/cycles` - Cycle management
- `POST /api/admin/cycles/:id/close` - Close cycle
- `GET /api/admin/cycles/:id/results` - Vote results

