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

## Setup

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

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Run development servers
npm run dev
```

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

