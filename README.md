# Collaborative Code Review Platform

An API-driven service that enables developers and teams to post code snippets, request feedback, and collaborate on reviews in real time.

## Features

- **Authentication & User Management**: Register, login, JWT auth with role-based access control (Reviewer, Submitter)
- **Projects/Repositories**: Create and manage projects with member assignment
- **Code Submissions**: Upload snippets or files with status tracking
- **Inline Comments**: Comment on specific lines of code
- **Review Workflow**: Approve or request changes on submissions
- **Notifications**: Activity feed with real-time WebSocket updates
- **Analytics Dashboard**: Project-level statistics and metrics

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Language**: TypeScript
- **Development**: nodemon, ts-node
- **Authentication**: JWT (jsonwebtoken)
- **Real-time**: WebSockets (ws)

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Collaborative-Code-Review-Platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=code_review_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development

WS_PORT=3001
```

4. Create the PostgreSQL database:
```sql
CREATE DATABASE code_review_db;
```

5. Run the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will automatically create the database schema on first run.

## Project Structure

```
src/
├── config/          # Configuration files (database, etc.)
├── db/              # Database migrations and utilities
├── middleware/      # Express middleware (auth, validation, error handling)
├── routes/          # API route definitions
├── controllers/     # Route controllers
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (JWT, etc.)
└── server.ts        # Main server entry point
```

## API Endpoints

### Authentication (Sprint 2)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Users (Sprint 2)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user

### Projects (Sprint 3)
- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/members` - Add member to project
- `DELETE /api/projects/:id/members/:userId` - Remove member from project

### Submissions (Sprint 4)
- `POST /api/submissions` - Create a submission
- `GET /api/projects/:id/submissions` - List submissions by project
- `GET /api/submissions/:id` - Get submission details
- `PUT /api/submissions/:id/status` - Update submission status
- `DELETE /api/submissions/:id` - Delete submission

### Comments (Sprint 5)
- `POST /api/submissions/:id/comments` - Add comment to submission
- `GET /api/submissions/:id/comments` - List comments for submission
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Review Workflow (Sprint 6)
- `POST /api/submissions/:id/approve` - Approve submission
- `POST /api/submissions/:id/request-changes` - Request changes
- `GET /api/submissions/:id/reviews` - Get review history

### Notifications & Stats (Sprint 7)
- `GET /api/users/:id/notifications` - Get user notifications
- `GET /api/projects/:id/stats` - Get project statistics

## Development Status

- ✅ **Sprint 1**: Project Setup & Foundations
- ⏳ **Sprint 2**: Authentication & Users (In Progress)
- ⏳ **Sprint 3**: Projects
- ⏳ **Sprint 4**: Code Submissions
- ⏳ **Sprint 5**: Comments
- ⏳ **Sprint 6**: Review Workflow
- ⏳ **Sprint 7**: Notifications & Stats
- ⏳ **Sprint 8**: Middleware & Testing

## License

ISC