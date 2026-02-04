# Real-time Quiz & Polling Platform

A full-stack real-time quiz application built with Next.js (App Router), Node.js, Express, Socket.io, and MongoDB.

## Features
- **Host Dashboard**: Create quizzes, manage rooms, control question flow.
- **Participant View**: Join via code, real-time voting, instant feedback.
- **Live Visualization**: Real-time bar charts showing voting trends.
- **Hybrid Architecture**: Next.js for UI, dedicated Socket.io server for real-time events.

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand, Recharts, NextAuth.js
- **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB)

## Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or Atlas URI)

## Installation

### 1. Backend Setup
```bash
cd server
npm install
# Create a .env file
echo "PORT=3001\nMONGODB_URI=mongodb://localhost:27017/live-quiz" > .env
```

### 2. Frontend Setup
```bash
cd client
npm install
# Create a .env.local file
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:3001\nNEXTAUTH_SECRET=your_secret_key\nNEXTAUTH_URL=http://localhost:3000" > .env.local
```

## Running the Application

### 1. Start the Backend Server
```bash
cd server
npm run dev
# Or if using raw node/ts-node directly:
# npx ts-node src/index.ts
```
*The server will run on http://localhost:3001*

### 2. Start the Frontend Client
```bash
cd client
npm run dev
```
*The client will run on http://localhost:3000*

## Usage Guide
1. **Host**: Go to `http://localhost:3000/host/dashboard`. Login with `admin/admin`. Click "Create New Room". Share the room code.
2. **Participant**: Go to `http://localhost:3000`. Enter the Room Code and your Name. Join.
3. **Gameplay**:
    - Host clicks "Start Next Question".
    - Participants see the question and timer.
    - As participants vote, the Host sees the graph update in real-time.
    - When time is up, results are shown.

## Project Structure
- `client/`: Next.js Frontend
- `server/`: Node.js Backend
- `server/src/socket/roomManager.ts`: Core game logic
