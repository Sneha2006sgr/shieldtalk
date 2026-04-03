# 🛡️ ShieldTalk — Classified Defence Communication System

A full-stack military-grade secure communication prototype for Indian defence personnel.

## Quick Start

### 1. Backend Setup
```bash
cd server
# Edit .env — set your MONGO_URI (MongoDB Atlas or local)
npm install
node seed.js        # Creates default HQ Admin
npm start           # or: npx nodemon index.js
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

App runs at: http://localhost:5173  
API runs at: http://localhost:5000

---

## Default Login (after seeding)
| Field    | Value             |
|----------|-------------------|
| Username | `hqadmin`         |
| Password | `ShieldTalk@2024` |
| Role     | HQ Admin          |

---

## User Flow
1. User submits registration at `/register`
2. HQ Admin approves at `/hq` → Pending tab
3. Activation link is generated (copy from alert popup)
4. User visits `/activate?token=...` to set username + password
5. User logs in via 6-step auth at `/login`

## Roles
| Role               | Access                        |
|--------------------|-------------------------------|
| `hq_admin`         | Full HQ dashboard + all perms |
| `admin_officer`    | HQ dashboard (limited)        |
| `defence_personnel`| Dashboard, Chat, SOS, Files   |
| `family_member`    | Dashboard, Chat               |

## Features
- 6-step login: Location → CAPTCHA → Liveness → Biometric → Credentials → Final Check
- Tab-switch resets login session
- AES-256 message encryption (client-side via crypto-js)
- Self-destruct messages (TTL index in MongoDB)
- Real-time chat via Socket.io
- SOS alert system with live HQ notification
- Face monitoring (simulated multi-face lock)
- Idle auto-logout (5 min)
- Screenshot detection + blur overlay
- Copy/paste/right-click disabled
- HQ audit logs for all actions
- File vault with encryption simulation
- Role-based access control (RBAC)
