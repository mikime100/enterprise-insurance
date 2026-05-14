
# Enterprise Insurance Web Application

## Overview
We need a full-stack web application for an enterprise insurance company. The application should allow customers to request quotes, purchase policies, manage their policies, and file claims. Insurance agents should be able to manage customer accounts, process claims, and view reports.

## Functional Requirements
### Customer Portal
- Request a quote by providing necessary information
- Purchase a policy 
- View and manage active policies
- File a claim and track its status
- Update personal and payment information

### Agent Portal
- Manage customer accounts
- Review and process claims
- Generate quotes and sell policies
- Access customer information and policy details
- View reports and dashboards

### Admin Portal
- Manage user accounts and permissions
- Configure insurance products and pricing
- View system-wide reports and analytics

## Data Model
- Customer: personal info, contact details, policies, claims
- Policy: type, coverage, premium, status, associated customer
- Claim: date, type, status, associated policy and customer
- Agent: personal info, contact details, associated customers and policies
- InsuranceProduct: name, description, coverage types, pricing

## Technical Requirements
- Frontend: React with modern UI component library
- Backend: Node.js with Express.js 
- Database: MongoDB
- Clean, modular, well-commented code
- Secure authentication and authorization
- Responsive design for desktop and mobile

## UI Mockup
[Include a simple wireframe or sketch of the main pages and user flow]

## Non-Functional Requirements
- Page load time under 2 seconds
- Support up to 1000 concurrent users
- 99.9% uptime target
- Scalable architecture to handle growth

## Testing
- Unit tests for critical backend functions
- Integration tests for API endpoints
- End-to-end tests for key user flows
- 80%+ test coverage target

## Deployment
- Dockerized application for easy deployment
- Deploy to cloud platform like AWS or Google Cloud
- Automated CI/CD pipeline

## Timeline
- **Milestone 1** (End of Day 1): 
  - Set up development environment
  - Create backend skeleton and database connection
  - Implement user authentication
- **Milestone 2** (End of Day 2):
  - Develop core backend APIs 
  - Create frontend scaffolding
  - Implement main UI pages and forms
  - Integration between frontend and backend
- **Deliverable** (Day 3 EOD):
  - Fully functional MVP application
  - All key user flows working
  - Basic testing and error handling
  - Deployed to staging environment

This is an aggressive timeline and the team will need to be highly productive to meet this deadline. Code quality and testing may need to be de-prioritized for speed. Please confirm this timeline works before proceeding.
