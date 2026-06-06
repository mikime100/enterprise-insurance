# Enterprise Insurance — Project Status

> **Last updated:** 2026-06-06
> **Current commit:** bead1ed — feat: insured coverage page — self-enrollment + Chapa payment integration
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
| @sendgrid/mail | latest | Transactional email (switched from SMTP — Render blocks SMTP ports) |
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
- **Cloud (Render/Production):** MongoDB Atlas M0 free tier

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

**Session production fix (critical):** Render requires `app.set('trust proxy', 1)` + `connect-mongo` mongoUrl (not url) + explicit `req.session.save()` after login. Missing any one = no Set-Cookie = instant redirect to login loop.

---

## File Structure

```
d:\Enterpise insurance\
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── api/index.js             # Axios instance (baseURL: /api, withCredentials)
│   │   ├── contexts/AuthContext.jsx # Auth state (user, login, logout, refreshUser)
│   │   ├── App.jsx                  # All routes + ProtectedRoute + RoleRedirect
│   │   ├── components/Layout/AppLayout.jsx  # Sidebar + header layout (mobile-responsive drawer)
│   │   └── pages/
│   │       ├── Landing.jsx          # Full landing page (hero, how-it-works, inline reg forms)
│   │       ├── Plans.jsx            # Public plans explorer (/plans) — products/tiers/pricing
│   │       ├── auth/
│   │       │   ├── Login.jsx        # Login with demo cards
│   │       │   ├── Register.jsx     # 2-step OTP self-registration
│   │       │   ├── VerifyEmail.jsx  # Standalone OTP verification page
│   │       │   ├── ForceChangePassword.jsx  # First-login password reset
│   │       │   └── BrokerApply.jsx  # Broker application form
│   │       ├── admin/               # superadmin portal
│   │       ├── payer/               # payer staff portal (underwriter dark theme)
│   │       ├── provider/            # hospital/clinic portal
│   │       ├── institution/         # HR admin portal
│   │       ├── insured/             # individual policyholder portal
│   │       ├── broker/              # sales broker portal
│   │       ├── agent/               # PLACEHOLDER — not wired to routes yet
│   │       └── customer/            # PLACEHOLDER — not wired to routes yet
│   └── vite.config.js               # Proxy: /api → localhost:5000
│
├── server/
│   ├── server.js                    # Entry point, DB connect, middleware, route mount
│   ├── middleware/auth.js           # requireAuth (JWT + session dual), requireRole
│   ├── models/
│   │   ├── User.js                  # Core user model (all roles, OTP fields, mustChangePassword)
│   │   ├── InsuranceProduct.js      # availableForIndividual flag
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
│   │   ├── broker.js                # sales_broker: customers, register-customer (single + bulk)
│   │   ├── institution.js           # institution_admin: employees, invite, invite-csv, tiers
│   │   ├── claims.js
│   │   ├── enrollments.js
│   │   ├── products.js
│   │   ├── coverages.js
│   │   ├── tiers.js
│   │   ├── quotes.js
│   │   ├── payments.js
│   │   ├── agreements.js
│   │   ├── policies.js
│   │   ├── users.js
│   │   └── reports.js
│   ├── services/
│   │   └── email.js                 # SendGrid HTTP API: OTP, employee invite, broker invite, approval emails
│   └── seeds/seed.js                # Full data seed (clears + recreates all); force-reseed endpoint available
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
| `underwriter` | `/payer/*` | Quotes & product management (dark theme UI) |
| `claims_officer` | `/payer/*` | Claims processing & assessment |
| `finance_officer` | `/payer/*` | Financial reports & claim settlement |
| `customer_support` | `/payer/*` | Customer-facing support |
| `provider_admin` | `/provider/*` | Hospital/clinic: submit claims, track claim status |
| `institution_admin` | `/institution/*` | HR: manage employees, invite/import staff, view enrollment |
| `insured_person` | `/insured/*` | Employee/individual: view coverage, file claims, dependents |
| `sales_broker` | `/broker/*` | Register customers (single + bulk), view customer portfolio |

**AppLayout sidebar nav** is role-aware — each role sees only their relevant menu items. Mobile-responsive with drawer sidebar.

---

## Auth Flows (Three Registration Paths)

### 1. Individual Self-Registration
```
/register → fill details → POST /api/auth/register → OTP email sent (SendGrid)
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
         → temp password generated → SendGrid email sent to employee
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
          → Admin clicks Approve → isActive=true, brokerStatus=approved → SendGrid email sent

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

## Chapa Payment Integration

Ethiopian payment gateway (chapa.co) wired for insured self-enrollment premium payment.

**Currency:** ETB  
**Routes:** `server/routes/chapa.js` → mounted at `/api/chapa`

**Flow:**
```
Insured → selects plan/tier → POST /api/chapa/initialize (enrollmentId)
       → Chapa returns checkout_url → frontend redirects user to Chapa-hosted checkout
       → Chapa redirects back to /insured/coverage?chapa_status=success&tx_ref=...
       → frontend calls GET /api/chapa/verify/:tx_ref
       → if success → enrollment.status set to 'active'
       → also: POST /api/chapa/webhook (server-side callback as backup)
```

**Env vars needed:**
```
CHAPA_SECRET_KEY=...        # Chapa secret key (test: CHAPUBK_TEST-...)
SERVER_URL=https://...      # Used for callback_url in production
```

**Test mode:** Use Chapa's test keys and test card credentials from their dashboard.

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

# Email — using SendGrid (switched from SMTP; Render blocks SMTP ports)
SENDGRID_API_KEY=
SENDGRID_FROM=no-reply@yourdomain.com
```

### Render (production backend)
- `MONGODB_URI` → Atlas connection string
- `SESSION_SECRET` → production secret
- `CLIENT_URL` → Vercel frontend URL
- `NODE_ENV=production`
- `SENDGRID_API_KEY` → production SendGrid key
- `SENDGRID_FROM` → verified sender address

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

## Completed Feature Milestones

| Milestone | Commit Range | Notes |
|-----------|-------------|-------|
| MVP: Multi-role portals + session auth + JWT mobile | `aefedac` | Initial |
| Full claims lifecycle + status machine | early commits | Claim.js VALID_TRANSITIONS |
| Three registration flows (OTP, invite, broker) | `ee8d9bf` | Email verification |
| Session production fix | `a06e121` | trust proxy + mongoUrl + session.save() |
| Email switched to SendGrid | `65c0319` | Render SMTP port blocking workaround |
| Full landing page | `3a73b14` | Hero, How-It-Works, inline forms |
| Admin user segmentation + broker bulk register | `6d10d86` | Advanced admin portal |
| Underwriter dark-theme portal redesign | `5704f5d` | Stitch layout |
| Responsive AppLayout (mobile drawer) | `cdfd580` | All portals mobile-friendly |
| Redesigned dashboards (insured/institution/provider/broker) | `4559295` | |
| Public plans page `/plans` | `770adba` | Products/tiers/pricing, audience targeting |
| Coverage quota bars + explore plans in insured portal | `0cce9ca` | |
| Mobile onboarding flow — animated slides, plan selection, register, OTP, change-password | `7cb8840` | Full Expo onboarding |
| Mobile onboarding redesign — full-bleed gradients, stat cards, accent dots | `a73ef63` | |
| Mobile onboarding — real photo backgrounds, gradient overlay, centered icon layout | `a69422d` | Images from `moble app intro/` folder |
| Insured self-enrollment + Chapa payment integration (web) | `bead1ed` | ETB payments via chapa.co |
| EAS Build (APK) + EAS Update (OTA) | early | Mobile CI/CD |

---

## Known Issues & Outstanding Work

### Resolved
- ~~Session redirect bug~~ — FIXED: trust proxy + mongoUrl session store + skip 401 on /auth/me and public paths
- ~~SMTP blocked on Render~~ — FIXED: switched to SendGrid HTTP API

### Pending / In Progress
- `agent/` and `customer/` page directories exist but are **not wired to routes** — placeholder for future portals
- Mobile app: `mustChangePassword` flow not yet implemented in Expo
- LLM plan recommender (deferred — to be built after core flows are stable)
- Seed: some products may need `availableForIndividual: true` for individual purchase filter on /plans

---

## Git History (Key Milestones)

| Commit | Description |
|--------|-------------|
| `aefedac` | Initial commit: Enterprise Insurance MVP |
| `ee8d9bf` | Feat: implement three registration flows with email verification |
| `a06e121` | Fix: trust proxy + mongoUrl session store + explicit session.save() |
| `65c0319` | Feat: switch email to SendGrid HTTP API |
| `3a73b14` | Feat: full landing page |
| `6d10d86` | Feat: differentiated insured portal, broker bulk register, advanced admin segmentation |
| `cdfd580` | Feat: AppLayout fully responsive (mobile drawer) |
| `4559295` | Feat: redesign insured/institution/provider/broker dashboards |
| `770adba` | Feat: Phase 1 — public plans page |
| `0cce9ca` | Feat: Get Coverage links to /plans, coverage quota bars |
| `7cb8840` | Feat: Mobile onboarding flow — animated slides, plan selection, register, OTP verify, change-password |
| `a73ef63` | Feat: Mobile onboarding redesign — full-bleed gradients, floating stat cards |
| `a69422d` | Feat: Mobile onboarding — real photo backgrounds with gradient overlay |
| `bead1ed` | Feat: Insured self-enrollment + Chapa payment integration ← **current** |

---

## How to Roll Back

```powershell
# View history
git log --oneline

# Create branch at any past commit (safe)
git checkout -b rollback-point <commit-hash>

# Hard reset (DESTRUCTIVE — loses commits after point)
git reset --hard <commit-hash>
```
