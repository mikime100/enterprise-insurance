# Enterprise Insurance — Project Status

> **Last updated:** 2026-05-18
> **Current commit:** ee8d9bf — feat: implement three registration flows with email verification
> **Branch:** master → origin/master (GitHub: mikime100/enterprise-insurance)

---

## Project Overview

**Enterprise Insurance Management Platform** — a full-stack, multi-stakeholder enterprise insurance web application built as a production-grade MVP. Covers the full insurance lifecycle: policy creation, quoting, enrollment, claims processing, and settlement.

**Working directory:** `d:\Enterpise insurance\` _(note: "Enterpise" is intentional — path typo in original folder name)_

---

## Tech Stack

### Frontend
| Tech | Version | Notes |
|------|---------|-------|
| React | 18/19 | Vite bundler |
| Ant Design | 5.x | UI component library |
| React Router | v6 | Client-side routing |
| Recharts | latest | Charts on dashboards |
| Axios | latest | HTTP client, `withCredentials: true` |
| dayjs | latest | Date formatting |

### Backend
| Tech | Version | Notes |
|------|---------|-------|
| Node.js + Express | 4.18 | REST API, port 5000 |
| Mongoose | 8.x | MongoDB ODM |
| express-session | 1.17 | Session-based auth for web |
| connect-mongo | 5.1 | Session store (MongoDB) |
| bcryptjs | 2.4 | Password hashing |
| jsonwebtoken | 9.x | JWT auth for mobile only |
| nodemailer | 8.x | Transactional email (OTP, invites) |
| multer | 2.x | File uploads (CSV) |
| csv-parse | 6.2 | CSV parsing for bulk employee import |
| helmet | 7.x | Security headers |

### Mobile
| Tech | Version | Notes |
|------|---------|-------|
| Expo SDK | 54 | React Native |
| expo-router | v6 | File-based routing |
| React Native | 0.81.5 | |
| expo-updates | ~29.0.17 | OTA updates via EAS |

### Database
- **Local dev:** `mongodb://localhost:27017/enterprise_insurance` (at `D:\bin\mongod.exe`, config at `D:\bin\mongod.cfg`, data at `D:\data`)
- **Cloud (Render/Production):** MongoDB Atlas M0 free tier (new account after old cluster stuck)

### Deployment
| Service | URL / Notes |
|---------|-------------|
| Backend API | Render (auto-deploy from GitHub master) |
| Frontend | Vercel (auto-deploy from GitHub master) |
| Mobile | EAS Build (preview profile = installable APK), EAS Update (OTA) |
| Expo project ID | `8d585697-87f4-4e1a-ba52-fd17d861f1ff` |
| Expo owner | `miki8425` |

---

## Architecture

```
Browser  ──[Vite proxy /api → :5000]──▶  Express API  ──▶  MongoDB
                                              │
                                    express-session (cookie)
                                    JWT (mobile Bearer header)

Mobile App  ──[Bearer JWT]──▶  Express API  ──▶  MongoDB
```

**Auth duality:**
- Web: Session cookie (`connect.sid`) via `express-session` + `connect-mongo`
- Mobile: Bearer JWT via `jsonwebtoken` (30-day expiry)
- `requireAuth` middleware handles both transparently

---

## File Structure

```
d:\Enterpise insurance\
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── api/index.js             # Axios instance (baseURL: /api, withCredentials)
│   │   ├── contexts/AuthContext.jsx # Auth state (user, login, logout, refreshUser)
│   │   ├── App.jsx                  # All routes + ProtectedRoute + RoleRedirect
│   │   ├── components/Layout/AppLayout.jsx  # Sidebar + header layout
│   │   └── pages/
│   │       ├── auth/
│   │       │   ├── Login.jsx        # Login with demo cards
│   │       │   ├── Register.jsx     # 2-step OTP self-registration
│   │       │   ├── VerifyEmail.jsx  # Standalone OTP verification page
│   │       │   ├── ForceChangePassword.jsx  # First-login password reset
│   │       │   └── BrokerApply.jsx  # Broker application form
│   │       ├── admin/               # superadmin portal
│   │       ├── payer/               # payer staff portal
│   │       ├── provider/            # hospital/clinic portal
│   │       ├── institution/         # HR admin portal
│   │       ├── insured/             # individual policyholder portal
│   │       └── broker/              # sales broker portal (NEW)
│   └── vite.config.js               # Proxy: /api → localhost:5000
│
├── server/
│   ├── server.js                    # Entry point, DB connect, middleware, route mount
│   ├── middleware/auth.js           # requireAuth, requireRole, generateToken
│   ├── models/
│   │   ├── User.js                  # Core user model (all roles, OTP fields, mustChangePassword)
│   │   ├── InsuranceProduct.js      # availableForIndividual flag (NEW)
│   │   ├── Claim.js                 # VALID_TRANSITIONS status machine
│   │   ├── PolicyEnrollment.js
│   │   ├── InsuredPerson.js
│   │   ├── Institution.js
│   │   ├── Payer.js
│   │   ├── Provider.js
│   │   ├── Tier.js
│   │   ├── Coverage.js
│   │   ├── Group.js
│   │   ├── Quote.js
│   │   ├── Payment.js
│   │   └── Agreement.js
│   ├── routes/
│   │   ├── auth.js                  # login, register, verify-email, resend-otp, set-password, broker-apply, mobile/login
│   │   ├── admin.js                 # superadmin: users, payers, providers, institutions, broker approvals
│   │   ├── broker.js                # sales_broker: customers, register-customer (NEW)
│   │   ├── institution.js           # institution_admin: employees, invite, invite-csv, tiers (NEW)
│   │   ├── claims.js
│   │   ├── enrollments.js
│   │   ├── products.js
│   │   ├── coverages.js
│   │   ├── tiers.js
│   │   ├── quotes.js
│   │   ├── payments.js
│   │   ├── agreements.js
│   │   └── reports.js
│   ├── services/
│   │   └── email.js                 # nodemailer: OTP, employee invite, broker invite, approval emails (NEW)
│   └── seeds/seed.js                # Full data seed (clears + recreates all collections)
│
└── mobile/                          # Expo app
    ├── app/                         # expo-router file-based routes
    ├── lib/api.ts                   # API_BASE = Render backend URL
    ├── app.json                     # newArchEnabled, EAS projectId, runtimeVersion
    └── .npmrc                       # legacy-peer-deps=true (EAS Build compatibility)
```

---

## User Roles & Portals

| Role | Portal URL | Description |
|------|-----------|-------------|
| `superadmin` | `/admin/*` | Full system access: users, payers, providers, institutions, broker approvals |
| `payer_admin` | `/payer/*` | Enterprise Insurance staff: products, quotes, enrollments, claims, providers |
| `underwriter` | `/payer/*` | Quotes & product management |
| `claims_officer` | `/payer/*` | Claims processing & assessment |
| `finance_officer` | `/payer/*` | Financial reports & claim settlement |
| `customer_support` | `/payer/*` | Customer-facing support |
| `provider_admin` | `/provider/*` | Hospital/clinic: submit claims, track claim status |
| `institution_admin` | `/institution/*` | HR: manage employees, invite/import staff, view enrollment |
| `insured_person` | `/insured/*` | Employee/individual: view coverage, file claims, dependents |
| `sales_broker` | `/broker/*` | Register customers, view customer portfolio |

**AppLayout sidebar nav** is role-aware — each role sees only their relevant menu items.

---

## Auth Flows (Three Registration Paths)

### 1. Individual Self-Registration
```
/register → fill details → POST /api/auth/register → OTP email sent
         → enter 6-digit OTP → POST /api/auth/verify-email → session set → /insured/dashboard
```
- OTP expires in 15 minutes
- Resend button with 60-second cooldown
- Unverified insured_person cannot log in (login returns 403)

### 2. Employee Invitation (Institution HR)
```
HR login → /institution/employees → "Invite Employee" modal
  Option A: Single form (name, email, phone, tier)
  Option B: CSV upload (columns: firstName, lastName, email, phone)
         → POST /api/institution/employees/invite or /invite-csv
         → temp password generated → email sent to employee
         → employee logs in → mustChangePassword=true → /change-password → set permanent password
         → /insured/dashboard
```
- Can auto-enroll in a coverage tier
- CSV shows result summary (invited vs. skipped with reasons)

### 3. Broker Flow
```
Applicant → /broker-apply → POST /api/auth/broker-apply
          → account created (isActive=false, brokerStatus=pending)
          → Admin sees pending applications on Admin Dashboard
          → Admin clicks Approve → isActive=true, brokerStatus=approved → email sent

Approved broker logs in → /broker/dashboard
Broker → /broker/register-customer → POST /api/broker/register-customer
       → temp password generated → email sent to customer
       → customer logs in → mustChangePassword=true → /change-password → set permanent password
       → /insured/dashboard
```

### mustChangePassword Gate
- `ProtectedRoute` in `App.jsx` redirects any user with `mustChangePassword=true` to `/change-password`
- `ForceChangePassword.jsx` calls `POST /api/auth/set-password` → clears flag → redirects to correct portal

---

## Demo Credentials (Seeded)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@enterpriseinsurance.com | Admin@123 |
| Payer Admin | payer.admin@enterpriseinsurance.com | Payer@123 |
| Underwriter | underwriter@enterpriseinsurance.com | Under@123 |
| Claims Officer | claims@enterpriseinsurance.com | Claims@123 |
| Finance Officer | finance@enterpriseinsurance.com | Finance@123 |
| Provider (St. Gabriel Hospital) | billing@stgabriel.com | Provider@123 |
| Institution HR (Ethio Telecom) | hr@ethiotelecom.et | Institution@123 |
| Institution HR (CBE) | hr@cbe.com.et | Institution@123 |
| Institution HR (Ethiopian Airlines) | hr@ethiopianairlines.com | Institution@123 |
| Insured Person (demo) | biruk@ethiotelecom.et | Insured@123 |

---

## Claims Status Machine

```
submitted
  └→ acknowledged
       └→ under_review ←──→ documentation_requested
            └→ investigation
                 └→ assessment
                      └→ approved / partially_approved / denied
                              └→ settled / closed
```
Enforced in `server/models/Claim.js` → `VALID_TRANSITIONS` map.

---

## Environment Variables

### server/.env (local dev)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/enterprise_insurance
SESSION_SECRET=ei-super-secret-session-key-change-in-production
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Email (not yet configured — add Mailtrap or SMTP for email to work)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Render (production backend)
- `MONGODB_URI` → Atlas connection string
- `SESSION_SECRET` → production secret
- `CLIENT_URL` → Vercel frontend URL
- `NODE_ENV=production`
- SMTP vars → (to be added for emails to work in production)

---

## Start Commands (Local Development)

```powershell
# 1. Start MongoDB
D:\bin\mongod.exe --config D:\bin\mongod.cfg

# 2. Start backend (new terminal)
cd "d:\Enterpise insurance\server"
npm run dev

# 3. Start frontend (new terminal)
cd "d:\Enterpise insurance\client"
npm run dev

# 4. Open browser
http://localhost:5173

# Re-seed database (clears all data!)
cd "d:\Enterpise insurance\server"
node seeds/seed.js
```

---

## Known Issues & Outstanding Work

### Bug (Critical)
- **Session redirect bug:** After login, all accounts get redirected back to login within seconds. Root cause under investigation — likely the `api.interceptors.response` firing on a 401 from one of the page's API calls. Possibly a cookie/session issue affecting all portals. **Status: OPEN**

### Pending Features
- SMTP configuration needed for emails to actually send (OTP, invitations)
- Seed file needs `availableForIndividual: true` on some products (for individual purchase filter)
- LLM plan recommender (deferred — to be built after core flows are stable)
- Mobile app: `mustChangePassword` flow not yet implemented in Expo app

### Completed Features
- [x] Multi-role portal routing (6 portals)
- [x] Session auth (web) + JWT auth (mobile)
- [x] Full claims lifecycle with status machine
- [x] Three registration flows (individual OTP, employee invite, broker flow)
- [x] Employee CSV bulk import
- [x] Admin broker approval/rejection
- [x] Force password change for invited/broker accounts
- [x] Email service (nodemailer templates) — needs SMTP config to deliver
- [x] EAS Build (installable APK) + EAS Update (OTA)
- [x] Render (backend) + Vercel (frontend) deployment
- [x] MongoDB Atlas (production database)

---

## Git History (Key Milestones)

| Commit | Description |
|--------|-------------|
| `aefedac` | Initial commit: Enterprise Insurance MVP |
| `b716a10` | Update color palette to light theme with green accent |
| `457a48a` | Fix: restore visible text on dark page banners |
| `0f17a91` | Rebrand to Enterprise Insurance with blue color palette |
| `185436d` | Fix: restore EAS update config, server session/DB init order |
| `6fc94b9` | Fix: .npmrc legacy-peer-deps for EAS Build |
| `ee8d9bf` | **Feat: implement three registration flows with email verification** ← current |

---

## How to Roll Back

Each commit is tagged in git. To roll back to a specific point:

```powershell
# View tags
git tag

# Roll back to a specific tag (creates a new branch from that point)
git checkout -b rollback-point <tag-name>

# Or hard reset (DESTRUCTIVE — loses commits after the tag)
git reset --hard <tag-name>

# View commit history
git log --oneline
```

**Recommended:** Use `git checkout -b <branch-name> <commit-hash>` to create a branch at any commit without losing other work.
