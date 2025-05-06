# GMeet-clone: Video Streaming App

**Project Duration:** May 2022 – July 2022
**Association:** Coding Club IIT-G GitHub

## Project Overview

This project is a peer-to-peer video chat platform built with a focus on real-time communication and a scalable architecture.

### Key Features & Technologies:

*   **Peer-to-Peer Video Chat:** Leverages **WebRTC** for direct peer-to-peer media streaming, incorporating **TURN/STUN** servers for robust NAT traversal.
*   **Signaling Service:** A **Node.js** based signaling server using **Socket.io** for real-time communication and **Redis Pub/Sub** for efficient room coordination and message broadcasting across multiple instances.
*   **Authentication:** Secure **JWT (JSON Web Token)** based authentication mechanism to protect routes and manage user sessions.
*   **Frontend:** A responsive **React.js** frontend featuring dynamic state management and adaptive layouts to ensure a seamless user experience across various devices and network conditions.
*   **Authentication Microservice (Prototype):** A **Spring Boot** authentication microservice was prototyped to centralize user management and token issuance, paving the way for future scalability and integration with other services.

## Repository Structure

```
GMeet-clone/
├── GMeet/                  # Node.js Signaling Server
│   ├── public/             # Static assets
│   ├── views/              # EJS templates
│   ├── server.js           # Main server file with Socket.io and Redis Pub/Sub
│   └── package.json        # Node.js dependencies
│
├── OAuth/                  # Authentication Service
│   ├── config/             # Configuration files including JWT setup
│   ├── middleware/         # Auth middleware for route protection
│   ├── models/             # MongoDB schemas (User model)
│   ├── routes/             # Auth routes (JWT, Google OAuth)
│   ├── views/              # EJS templates for auth pages
│   └── app.js              # Main auth service entry point
│
└── GMeet-react/            # React.js Frontend
    ├── public/             # Static assets
    ├── src/                # React source code
    │   ├── components/     # React components
    │   │   ├── Auth/       # Authentication components
    │   │   ├── VideoChat/  # WebRTC video chat components
    │   │   ├── Home/       # Home page components
    │   │   └── Layout/     # Layout components
    │   ├── contexts/       # React context providers
    │   ├── App.js          # Main React component
    │   └── index.js        # React entry point
    └── package.json        # React dependencies
```

## Implementation Details

### 1. WebRTC with TURN/STUN for NAT Traversal

The application uses WebRTC for peer-to-peer video and audio streaming, with PeerJS as a wrapper to simplify the implementation. TURN/STUN servers are configured to handle NAT traversal scenarios where direct peer connections aren't possible.

Key features:
- Multiple peer connections in a single room
- Video/audio mute controls
- Screen sharing capability
- Adaptive video quality based on network conditions
- Real-time connection status monitoring

### 2. Node.js Signaling Server with Redis Pub/Sub

The signaling server facilitates the initial connection between peers and handles room coordination. It uses Socket.io for WebSocket communication and Redis Pub/Sub to enable scaling across multiple server instances.

Key features:
- Real-time room events broadcasting
- Message relaying between peers
- User presence tracking (join/leave events)
- Support for horizontal scaling via Redis

### 3. JWT Authentication

The authentication system provides secure user management with JWT tokens. It supports both traditional email/password authentication and Google OAuth.

Key features:
- Secure password hashing with bcrypt
- JWT token issuance and verification
- Protected routes with middleware
- Token refresh mechanism
- User roles and permissions

### 4. React.js Frontend

The frontend uses React.js with Context API for state management, providing a responsive and adaptive user interface.

Key features:
- Responsive design for all device types
- Dynamic video grid layout
- Network status indicators and warnings
- Real-time chat messaging
- Adaptive UI based on connection quality

## Setup and Installation

### Prerequisites
- Node.js (v14+)
- Redis server
- MongoDB
- Google OAuth credentials (for OAuth integration)

### Backend Setup

1. Install dependencies in both GMeet and OAuth directories:
```bash
cd GMeet && npm install
cd ../OAuth && npm install
```

2. Configure environment variables:
   - Create a `.env` file in the OAuth directory with MongoDB connection string
   - Set up Google OAuth credentials if using that login method

3. Start Redis server:
```bash
redis-server
```

4. Start the services:
```bash
# Start OAuth service
cd OAuth && npm start

# Start GMeet signaling server
cd ../GMeet && npm start
```

### Frontend Setup

1. Install dependencies:
```bash
cd GMeet-react && npm install
```

2. Start the React development server:
```bash
npm start
```

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request. 