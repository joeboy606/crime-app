# CRIME REPORTING AND EMERGENCY RESPONSE SYSTEM WITH REAL-TIME LOCATION TRACKING FOR AREA COMMAND POLICE STATION, AUCHI DIVISION

---

## 1.0 INTRODUCTION

Crime reporting and emergency response in many communities face significant challenges — slow report submission, lack of real-time communication between citizens and law enforcement, and delayed response times due to inadequate location data. The Area Command Police Station, Auchi Division, requires a modern digital solution that bridges the gap between citizens and police authorities.

This project presents a mobile application that enables citizens to report crimes instantly, share their real-time location, and communicate directly with police administrators via live chat. Police administrators can manage incoming reports, track citizens' live locations, update report statuses, and respond to emergencies efficiently — all from a single dashboard.

---

## 2.0 SYSTEM OVERVIEW

The system is a cross-platform mobile application built with React Native (Expo) for the frontend and Node.js with Express and MongoDB for the backend. It comprises two primary user interfaces:

- **Citizen Interface**: Allows users to register, log in, report crimes, activate an SOS alert, share live location, and chat with the police station.
- **Admin Interface**: Enables police personnel to view all incoming reports, manage report statuses (pending → dispatched → resolved), view citizens' live locations on a map, communicate via live chat, and manage registered users.

---

## 3.0 KEY FEATURES

### 3.1 User Authentication
- Secure sign-up and login for both citizens and admin users
- JWT-based authentication with encrypted token storage via Expo SecureStore
- Role-based access control (citizen vs admin)

### 3.2 Crime Reporting
- Citizens can submit crime reports with type classification (Emergency, Theft, Robbery, Assault, Vandalism, Suspicious, Other)
- Reports include description, location coordinates, and address
- Admin can update report status: pending → dispatched → resolved
- Admin can delete reports via long-press

### 3.3 Real-Time Location Tracking
- Citizens can enable live location sharing, which updates their position every 30 seconds
- Admin dashboard displays active live locations with citizen names and coordinates
- Tapping a location opens Google Maps for navigation
- Location data refreshes automatically every 15 seconds

### 3.4 Live Chat System
- Real-time direct messaging between citizens and admin
- Chat list screen for admin to view all conversations with unread message badges
- Message editing and deletion
- Citizens can initiate chat from their dashboard; admin can chat from the admin panel
- Messages are aligned: sent messages on the right, received on the left
- Unread message counts displayed as badges that clear when the chat is opened

### 3.5 SOS/Emergency Alert
- Dedicated SOS tab in the citizen interface with a prominent emergency button
- One-tap emergency alert activation

### 3.6 Admin Dashboard
- **Home tab**: Filterable report list (All/Pending/Dispatched/Resolved) with live location tracking section
- **Users tab**: List of all registered citizens with contact details
- **Reports tab**: Complete report history with count statistics
- Floating action button for quick access to live chats with unread badge

### 3.7 Push Notification Integration
- Socket-based real-time notifications for new messages and report updates

---

## 4.0 TECHNOLOGY STACK

| Component | Technology |
|-----------|------------|
| **Frontend Framework** | React Native with Expo SDK 56 |
| **Navigation** | Expo Router (file-based routing) |
| **Language** | TypeScript |
| **State Management** | React Context API |
| **HTTP Client** | Axios |
| **Backend Runtime** | Node.js with Express |
| **Database** | MongoDB (via Mongoose) |
| **Authentication** | JWT (JSON Web Tokens) |
| **Secure Storage** | Expo SecureStore |
| **Location Services** | Expo Location API |
| **Clipboard** | Expo Clipboard |
| **Icons** | Ionicons via @expo/vector-icons |
| **Deployment** | Railway (backend) |
| **APK Build** | Gradle + Hermes (Android) |

---

## 5.0 SYSTEM ARCHITECTURE

### 5.1 Frontend Architecture (Mobile App)

The mobile app follows a screen-based architecture using Expo Router's file-based routing:

```
src/
├── app/                    # Screen components (routes)
│   ├── _layout.tsx         # Root layout with stack navigator
│   ├── index.tsx           # Landing page
│   ├── login.tsx           # Login screen
│   ├── register.tsx        # Registration screen
│   ├── admin.tsx           # Admin dashboard (3 tabs)
│   ├── citizen.tsx         # Citizen dashboard
│   ├── chat.tsx            # Live chat screen
│   ├── chat-list.tsx       # Conversation list (admin)
│   ├── report.tsx          # Report submission form
│   └── live-map.tsx        # Live location map view
├── context/
│   ├── AuthContext.tsx      # Authentication state & methods
│   └── ChatContext.tsx      # Chat state & message management
├── services/
│   ├── api.ts              # Axios API client with JWT interceptor
│   ├── config.ts           # API URL configuration
│   └── socket.ts           # WebSocket real-time communication
├── types/
│   └── index.ts            # TypeScript interfaces
└── hooks/                  # Custom React hooks
```

### 5.2 Backend Architecture

The backend is a RESTful API server:

```
backend/
├── server.js               # Express server with routes & MongoDB
├── package.json            # Dependencies
└── railway.json            # Railway deployment config
```

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/users` | GET | List all users (admin) |
| `/api/reports` | GET | Get all reports |
| `/api/reports` | POST | Create a report |
| `/api/reports/:id` | GET | Get report by ID |
| `/api/reports/:id/status` | PATCH | Update report status |
| `/api/reports/:id` | DELETE | Delete a report |
| `/api/chat/direct` | POST | Start a direct chat |
| `/api/chat` | GET | Get all conversations |
| `/api/chat/:id` | GET | Get conversation by ID |
| `/api/chat/:id/message` | POST | Send a message |
| `/api/chat/:id/read` | PATCH | Mark messages as read |
| `/api/chat/:citizenId` | DELETE | Delete a conversation |
| `/api/location` | POST | Update live location |
| `/api/locations` | GET | Get all live locations |

---

## 6.0 DATA FLOW

1. **User Registration/Login**: Citizen or admin registers/logs in → JWT token issued → stored securely on device
2. **Crime Report Submission**: Citizen fills report form → location captured via GPS → POST to `/api/reports` → report appears on admin dashboard
3. **Report Management**: Admin views reports → updates status (dispatch/resolve) → citizen sees updated status
4. **Live Location Sharing**: Citizen enables tracking → location sent every 30s to `/api/location` → admin sees active locations with auto-refresh
5. **Live Chat**: Citizen/admin sends message → POST to `/api/chat/:id/message` → recipient sees message in real-time (with polling every 3 seconds) → unread badges update accordingly

---

## 7.0 USER ROLES

### Citizen
- Register and manage account
- Submit crime reports with location
- Activate SOS/emergency alert
- Share live location
- Chat directly with police admin
- View personal report history

### Admin (Police)
- View all incoming crime reports
- Filter reports by status (pending/dispatched/resolved)
- Dispatch officers to crime scenes
- Mark reports as resolved
- Delete reports when necessary
- View live locations of all citizens
- Communicate with citizens via live chat
- Manage all conversations with unread indicators
- View registered citizens list

---

## 8.0 DEPLOYMENT

### Backend Deployment
- Hosted on Railway (cloud platform)
- MongoDB database (cloud-hosted)
- Accessible via REST API endpoints

### Mobile App Deployment
- Built as a standalone Android APK
- Uses Hermes JavaScript engine for optimized performance
- APK signed with debug keystore for installation on Android devices

---

## 9.0 CONCLUSION

The Crime Reporting and Emergency Response System provides a comprehensive digital platform that modernizes the crime reporting process at the Area Command Police Station, Auchi Division. By combining real-time location tracking, instant chat communication, and efficient report management, the system significantly reduces response times and improves coordination between citizens and law enforcement. The cross-platform mobile application ensures accessibility for citizens while providing police administrators with powerful tools to manage and respond to incidents effectively.

---

*Project developed for Area Command Police Station, Auchi Division*
