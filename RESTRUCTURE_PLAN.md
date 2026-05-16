# Plan: Full Model & Portal Restructure

## Context
Replace the 3-role MVP (customer/agent/admin) with the real 4-stakeholder architecture:
Payer (insurer) | Provider (hospital/shop) | Institution (employer) | Insured Person (employee/individual)

No 3rd-party integrations — payments and documents are mocked for demo.

---

## Phase 1 — New Backend Models (server/models/)

| File | Key Fields |
|---|---|
| `User.js` | roles: superadmin, payer_admin, underwriter, claims_officer, finance_officer, provider_admin, institution_admin, sales_broker, insured_person, customer_support + linkedEntity polymorphic ref |
| `Payer.js` | name, licenseNumber, type, address, contactEmail, isActive |
| `Provider.js` | name, type (hospital/clinic/auto_repair/etc), licenseNumber, specializations, isActive |
| `Institution.js` | name, type (corporate/sme/government/school), registrationNumber, isActive |
| `InsuredPerson.js` | user ref (optional), institution ref, group ref, dependents[], nationalId, dateOfBirth, gender |
| `Group.js` | name, institution ref, tier ref |
| `InsuranceProduct.js` (update) | + payer ref, targetMarkets[], ageRange, tiers[], coverages[] — remove old coverageOptions |
| `Coverage.js` (new) | name, payer ref, productType, limits {annual, perClaim, lifetime}, deductible, copaymentPct |
| `Tier.js` (new) | name, product ref, coverages [{coverage, customLimit}], annualPremium, employerSharePct, maxDependents |
| `Quote.js` (rewrite) | quoteNumber auto, payer ref, institution/insuredPerson ref, product ref, assignedUnderwriter ref, memberCount, riskFactors, scenarios [{name, tier, annualPremium, notes}], selectedScenario, status, finalPremium |
| `PolicyEnrollment.js` (replaces Policy.js) | enrollmentNumber auto, quote ref, product/tier/payer/institution refs, insuredPersons[], premium {amount, employerShare, employeeShare}, paymentHistory[], coverages[], status |
| `Claim.js` (extend) | + provider ref, submissionType (insured_reimbursement/provider_direct), assignedOfficer ref, services[], documents[] mocked, financeApproval {approvedBy, approvedAt} — extended status enum with pending_finance_approval + payment_initiated |
| `Payment.js` (new) | paymentNumber auto, type, direction (institution_to_payer / payer_to_provider / etc), claim ref, enrollment ref, amount, status, paymentMethod, approvedBy ref |
| `Agreement.js` (new) | payer ref, provider ref, status, effectiveDate, paymentCycle, services[], coverages[] |

---

## Phase 2 — New Backend Routes (server/routes/)

New route files: payer.js, provider.js, institution.js, insured.js, admin.js, coverages.js, tiers.js, enrollments.js, payments.js, agreements.js

Key logic changes:
- claims.js: PATCH /:id/finance-approve for finance_officer role
- quotes.js: PATCH /:id/underwrite adds scenarios; POST /:id/accept creates PolicyEnrollment
- payments.js: POST / mocks payment; PATCH /:id/approve for finance_officer

Update server.js to mount all new routes.

---

## Phase 3 — New Seed Data (server/seeds/seed.js)

- Payer: "Nile Insurance S.C." with 4 staff users
- Provider: "St. Gabriel Hospital" + "AutoFix Garage"  
- Institution: "Ethio Telecom" with HR admin + 3 employees
- 2 Products: NileCare Health Plan + NileAuto Comprehensive
- 7 Coverages (4 health + 3 auto), Tiers (Basic/Standard/Premium each)
- 1 Quote (under_review), 2 Enrollments (active), 3 Claims (various stages), 1 Agreement

---

## Phase 4 — New Frontend Portals (client/src/pages/)

```
pages/
├── auth/Login.jsx          (new demo credentials)
├── payer/                  Dashboard, Products, Coverages, Quotes, Enrollments, Claims, Providers, Reports
├── provider/               Dashboard, SubmitClaim, Claims
├── institution/            Dashboard, Groups, Employees, Policy, Claims
├── insured/                Dashboard, Coverage, Claims, Dependents
└── admin/                  Dashboard, Payers, Providers, Institutions, Users, Reports
```

Update App.jsx: 5 portal route trees, RoleRedirect maps role → portal path
Update AppLayout.jsx: 5 distinct nav menus per stakeholder

---

## Implementation Order
1. Backend models → 2. Middleware (new roles) → 3. Routes + server.js → 4. Seed data
5. App.jsx routing → 6. AppLayout nav → 7. Payer pages → 8. Provider pages
9. Institution pages → 10. Insured pages → 11. Admin pages

## Verification
- npm run dev — both services start clean
- Login with each seeded role → correct portal
- Demo flows: product creation → quote → enrollment → claim → finance approval → settled
