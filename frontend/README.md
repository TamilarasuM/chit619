# Chit Fund Manager - Frontend

A modern Progressive Web App (PWA) built with React + Vite for managing chit funds.

## Tech Stack

- **React 18** - UI Library
- **Vite** - Build Tool & Dev Server
- **React Router DOM v6** - Routing
- **Tailwind CSS** - Styling
- **Material-UI** - UI Components
- **Axios** - HTTP Client
- **Vite PWA Plugin** - Progressive Web App Support
- **date-fns** - Date Formatting

## Project Structure

```
frontend/
├── src/
│   ├── components/common/      # Reusable components
│   ├── pages/auth/             # Login page
│   ├── pages/admin/            # Admin dashboard
│   ├── pages/member/           # Member dashboard
│   ├── context/AuthContext.jsx # Authentication state
│   ├── services/               # API services
│   ├── App.jsx                 # Main app with routing
│   └── index.css               # Tailwind imports
├── .env                        # Environment variables
├── vite.config.js              # Vite + PWA config
└── tailwind.config.js          # Tailwind config
```

## Setup Instructions

### 1. Install dependencies (already done):
```bash
npm install
```

### 2. Configure environment:
```bash
# .env file already created with:
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Start development server:
```bash
npm run dev
```

### 4. Open browser:
```
http://localhost:3000
```

## Features Implemented ✅

- ✅ Login page with validation
- ✅ JWT authentication
- ✅ Protected routes (admin/member)
- ✅ Admin dashboard layout
- ✅ Member dashboard layout
- ✅ Responsive design (Tailwind CSS)
- ✅ PWA support (offline capable)
- ✅ API service layer
- ✅ Auth context & state management
- ✅ Reusable UI components (Button, Input, Card, Loading)

## Available Scripts

- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Authentication Flow

1. Enter phone & password on login page
2. API validates and returns JWT token
3. Token stored in localStorage
4. Token added to all API requests
5. Redirect to appropriate dashboard (admin/member)
6. On 401, auto-logout and redirect to login

## Routing

```
/                       → /login
/login                  → Login page
/admin/dashboard        → Admin dashboard (protected)
/member/dashboard       → Member dashboard (protected)
```

## PWA Features

- **Installable** - Add to home screen
- **Offline** - Service worker caching
- **Fast** - Cache-first for assets, network-first for API
- **Responsive** - Mobile-friendly design

## Next Steps

Ready for Phase 2+ implementation:
- Admin pages (chits, members, auctions)
- Member pages (my chits, auctions, payments)
- Forms with validation
- Data tables
- Charts & analytics
- Real-time updates
- Multi-language (Tamil)
- PDF reports

## Testing

Start backend first:
```bash
cd ../backend
npm run dev
```

Then start frontend:
```bash
cd frontend
npm run dev
```

Login with test credentials (once backend auth is implemented).

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT
