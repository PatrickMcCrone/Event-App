# Event App

A full-stack event management application built with Next.js, Express, and PostgreSQL. This application allows users to create, manage, and participate in events with features like real-time notifications, announcements, and user management.

Front-end:

-   Johnathan Whitney
-   Matthew Stahlman

Back-end:

-   Patrick McCrone
-   Gabriel Salim

## Features

-   🔐 **Authentication**

    -   Google OAuth integration
    -   Secure session management
    -   Role-based access control (Admin, Creator, Participant)

-   📅 **Event Management**

    -   Create, edit, and delete events
    -   Set event dates, times, and locations
    -   Timezone support for global events
    -   Event status tracking (upcoming, ongoing, completed, calendar)

-   👥 **User Management**

    -   User roles and permissions
    -   Event participants and subscribers
    -   Event administrators
    -   User settings and preferences

-   📢 **Communication**

    -   In-app notifications
    -   Event announcements
    -   Event reminders

-   ⚙️ **Settings & Preferences**
    -   Timezone management
    -   Notification preferences
    -   Event reminder settings

## Tech Stack

### Frontend

-   Next.js 14
-   React
-   Tailwind CSS
-   NextAuth.js for authentication
-   TypeScript

### Backend

-   Express.js
-   PostgreSQL
-   JWT for authentication
-   Node-fetch for API calls
-   Resend for admin applications

## Prerequisites

-   Node.js (v18 or higher)
-   PostgreSQL
-   Google OAuth credentials
-   Resend API key

## Environment Variables

### Frontend (.env.local)

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_API_URL=http://localhost:3001/
NEXTAUTH_URL=http://localhost:3000/
NEXTAUTH_SECRET=your_nextauth_secret
```

### Backend (.env)

```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_api_key
ADMIN_EMAILS=comma,separated,admin,emails
```

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd event-app
```

2. Install dependencies:

```bash
# Install frontend dependencies
cd client/event-app
npm i
npm i next-auth
npm i date-fns

# Install backend dependencies
cd ../../server
npm i
npm i resend
```

3. Set up the database:

-   Create a PostgreSQL database
-   Update the DATABASE_URL in your backend .env file
-   The database tables will be automatically created when the server starts

4. Configure Google OAuth:

-   Go to Google Cloud Console
-   Create a new project
-   Enable Google OAuth API
-   Create credentials (OAuth 2.0 Client ID)
-   Add authorized redirect URIs
-   Update the frontend .env.local file with your credentials

5. Start the development servers:

```bash
# Start backend server (from server directory)
npm run dev

# Start frontend server (from client/event-app directory)
npm run dev
```

## API Endpoints

### Authentication

-   `POST /auth/google` - Google OAuth authentication
-   `POST /auth/login` - Traditional login

### Events

-   `GET /events` - Get all events
-   `GET /events/:id` - Get single event
-   `POST /events` - Create event
-   `PUT /events/:id` - Update event
-   `DELETE /events/:id` - Delete event

### Event Management

-   `POST /events/:id/subscribe` - Subscribe to event
-   `DELETE /events/:id/subscribe` - Unsubscribe from event
-   `GET /events/:id/subscribers` - Get event subscribers
-   `GET /events/:id/participants` - Get event participants
-   `GET /events/:id/admins` - Get event administrators

### Notifications

-   `GET /notifications` - Get user notifications
-   `PUT /notifications/:id/read` - Mark notification as read
-   `DELETE /notifications/:id` - Delete notification

### Announcements

-   `POST /events/:id/announcements` - Create announcement
-   `GET /events/:id/announcements` - Get event announcements
-   `DELETE /events/:id/announcements/:announcementId` - Delete announcement

### User Settings

-   `GET /settings/reminders/:userId` - Get user settings
-   `POST /settings/reminders` - Update user settings

## Database Schema

The application uses the following main tables:

-   users
-   events
-   event_participants
-   event_subscriptions
-   event_admins
-   announcements
-   notifications
-   user_settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
