# EventHub

EventHub is a full-stack campus events application for the W2026 project. Users can create accounts, publish events, RSVP to events, and see live updates through WebSockets.

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT and bcrypt
- Real time: Socket.IO
- Frontend: React and Vite
- Deployment target: Render

## Submission Links

- Frontend: https://eventhub-fullstack-1.onrender.com
- Backend API: https://eventhub-fullstack.onrender.com
- Health check: https://eventhub-fullstack.onrender.com/api/health

## Data Models

- User: signup, login, and current user profile
- Event: full CRUD for campus event records
- RSVP: full CRUD for event attendance records

## WebSocket Events

- `event:created`: broadcasts when a user creates an event
- `event:updated`: broadcasts when an event is edited
- `event:deleted`: broadcasts when an event is deleted
- `rsvp:created`: broadcasts when a user RSVPs
- `rsvp:updated`: broadcasts when a user changes RSVP status
- `rsvp:deleted`: broadcasts when a user removes an RSVP

## Local Setup

1. Install backend dependencies:

```bash
cd server
npm install
```

2. Create `server/.env` from `server/.env.example`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

3. Start the backend:

```bash
npm run dev
```

4. Install frontend dependencies:

```bash
cd ../client
npm install
```

5. Create `client/.env` from `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

6. Start the frontend:

```bash
npm run dev
```

## API Summary

Authentication:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Events:

- `POST /api/events`
- `GET /api/events`
- `GET /api/events/:id`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`

RSVPs:

- `POST /api/rsvps`
- `GET /api/rsvps`
- `GET /api/rsvps/:id`
- `PUT /api/rsvps/:id`
- `DELETE /api/rsvps/:id`

## Render Deployment

Backend Web Service:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`

Frontend Static Site:

- Root directory: `client`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variables: `VITE_API_URL`, `VITE_SOCKET_URL`

After deployment, set `CLIENT_URL` on the backend to your Render frontend URL, and set `VITE_API_URL` / `VITE_SOCKET_URL` on the frontend to your Render backend URL.
