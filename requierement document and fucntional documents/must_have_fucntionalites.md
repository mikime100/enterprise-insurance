Core Insurance Domain Features
1. Policy & Product Management
Medical Policies (src/models/MedicalPolicy.model.js) — Configurable policy templates with age limits, target markets (Corporate, SME, Individual, Students, Seniors, Government Employees, etc.), base pricing, and payment schedules
Coverage Management (src/models/Coverage.model.js) — Coverage types with annual/lifetime/per-claim/per-incident limits, activation/deactivation, and document attachments
Tiers (src/models/Tier.model.js) — Pricing tiers within insurance packages, with coverage-tier-limit mappings
2. Underwriting & Quotation
Quotes (src/router/quote.router.js) — Multi-scenario versioned quotations with cloned policy snapshots, comments, and scenario comparisons (Option 1, Option 2, etc.)
Risk Configuration & Rating (src/models/RiskConfiguration.model.js, src/router/Rating.js) — GLM-based premium engine with age, gender, and claims-history risk multipliers

4. Claims Processing
Claims (src/models/Claim.model.js, src/controller/claim/) — Full claim lifecycle: submission by provider or insured person, approval/decline/forwarding, manual service entry for reimbursement, batch submission, fraud analysis, draft saving, and claim analytics
5. Enrollment & Member Management
Insured Persons (src/models/InsuredPerson.model.js) — Policy holder enrollment (individual or via institution), SSN search, dependent tracking, group assignment, and ID document uploads
Groups (src/models/Group.model.js) — Department-level groupings within institutions for corporate plans
6. Financial Settlements & Payments
Payments (src/models/Payment.model.js) — Multi-direction flows: payer-to-provider, institution-to-payer, insured-to-payer (reimbursement). Tracks statuses from upload through confirmation to completion
Agreements (src/models/Agreement.model.js) — Provider-payer service agreements with payment cycle config (daily, weekly, monthly, etc.), price revision schedules, and service/coverage mappings
7. Service & Coverage Catalog
Services (src/models/Service.model.js) — Medical procedures/treatments with regular and discounted pricing, bulk Excel/CSV import, and provider assignment
Coverage-Service Mapping (src/models/CoverageServiceMapping.model.js) — Defines which services are covered under which coverage types per provider-payer agreement
8. Multi-Party Stakeholder System
The platform models four distinct actor types, each with their own auth, dashboards, and workflows:
Stakeholder
Role
Payers
Insurance companies underwriting policies
Providers
Clinics/hospitals delivering services
Institutions
Employers purchasing group plans
Insured Persons
Individual policy holders / employees
9. Sales & Broker Channel
Sales Broker Requests (src/models/SalesBrokerInsuranceRequest.model.js) — Broker-originated insurance requests with status tracking and analytics
10. Role-Based Access Control
Roles & Privileges (src/models/Role.model.js, src/models/Privelege.model.js) — SuperAdmin, PayerAdmin, ProviderAdmin, InstitutionAdmin, SalesBroker — each with scoped permissions enforced across all endpoints