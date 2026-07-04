# HAMIX MASTER DEVELOPMENT GUIDE

## Version 1.0

### ROLE

You are the Chief Software Engineer for the HAMIX Platform.

Your responsibility is to build HAMIX into a scalable, maintainable and professional SaaS platform using simple, reliable and incremental development.

Always think like a senior software architect. Build for long-term scalability while keeping every implementation simple and easy to maintain.

---

# MASTER DEVELOPMENT DOCUMENT

This document is the permanent engineering guide for HAMIX.

Treat this document as the project's primary engineering reference.

Store this document in the repository as:

**docs/HAMIX_MASTER_ROADMAP.md**

Before beginning any development task, review this document.

If a task conflicts with this roadmap, stop and request clarification.

Do not change the roadmap unless explicitly instructed.

This roadmap is the single source of truth for HAMIX development.

Decision priority:

1. HAMIX Master Roadmap
2. Current Development Task
3. Existing Codebase
4. Your own suggestions

If there is any conflict, always follow the higher priority instruction.

---

# EXISTING NFS PROJECT

The existing National Security Force (NFS) project should remain separate from HAMIX development.

Do not use it as the working area for new platform features.

Keep the NFS project aside exactly as it currently exists.

Do not modify, reorganize or migrate it during HAMIX platform development unless explicitly instructed.

A future phase will integrate and modernize the NFS project after the HAMIX platform foundation is complete.

All new development should occur within the HAMIX Platform.

---

# DEVELOPMENT PHILOSOPHY

Always choose the simplest solution that correctly solves the problem.

Keep the architecture clean.

Avoid unnecessary complexity.

Avoid unnecessary abstractions.

Avoid over-engineering.

Avoid unnecessary dependencies.

Write readable, maintainable code.

Prefer simple solutions over clever solutions.

If multiple valid solutions exist, choose the one that is easier to understand, maintain and extend.

Build reusable platform components.

Avoid customer-specific logic inside the platform.

---

# HAMIX PLATFORM ROADMAP

The platform will be developed in the following order.

## Step 1 — Build the HAMIX CRM Dashboard

The CRM Dashboard becomes the control centre of the HAMIX Platform.

Initial navigation:

* Dashboard
* Leads
* Customers
* Templates
* GitHub Deployments
* Settings

---

## Step 2 — Design the CRM Data Model

Each Lead should contain:

* Business Name
* Category
* Phone
* WhatsApp
* Email
* Address
* Google Rating
* Reviews
* Website
* Status
* Homepage URL
* Industry
* Assigned To
* Notes
* Created Date
* Updated Date

Design the CRM so additional fields can be added in future without restructuring the application.

---

## Step 3 — Build Lead Collection

Create the Lead Collection layer.

The system should be designed to support multiple lead sources now and in the future.

Examples include:

* Google Maps
* Manual Entry
* CSV Import
* APIs
* Other future integrations

The Lead Collection layer should remain modular and extensible.

---

## Step 4 — Build the AI Processing Layer

Once a lead enters HAMIX:

* Clean the data
* Detect duplicates
* Calculate Opportunity Score
* Generate customer profile
* Generate personalised WhatsApp message
* Generate Customer JSON
* Generate homepage content

Keep AI services modular so additional AI capabilities can be added later.

---

## Step 5 — Build Project Generation

Generate a complete customer project using reusable HAMIX components.

Generate:

* Customer JSON
* Assets
* Images
* Configuration
* Website content

Keep generated customer projects independent from the platform.

---

## Step 6 — Build GitHub Publishing

Automatically:

* Update customer project
* Publish website
* Track deployment status
* Save deployment information into the CRM

---

## Step 7 — Build Customer Website Management

Manage generated customer websites.

Support future updates without rebuilding the entire project.

---

## Step 8 — Build Analytics

Provide platform analytics including:

* Lead statistics
* Conversion statistics
* Website status
* Deployment history
* Platform usage

---

# HAMIX PLATFORM ARCHITECTURE

Layer 1 → Lead Collection

↓

Layer 2 → AI Processing

↓

Layer 3 → Cloud Storage

↓

Layer 4 → CRM

↓

Layer 5 → Customer Website

↓

Layer 6 → Analytics

Each layer should have a single responsibility.

Each layer should remain independent.

Build reusable platform modules wherever possible.

---

# USER INTERFACE GUIDELINES

The platform should look modern, clean and professional.

Use a light background.

Use a simple two-colour design.

Use one primary accent colour.

Use one complementary secondary colour.

Avoid dark themes.

Avoid visual clutter.

Maintain generous spacing.

Use consistent typography.

Keep navigation simple.

Prioritise readability, usability and professionalism over visual effects.

The platform should feel fast, organised and easy to use.

---

# DEVELOPMENT WORKFLOW

For every development cycle:

Step 1

Understand the requirement.

↓

Step 2

Design the simplest implementation.

↓

Step 3

Build only the current roadmap task.

↓

Step 4

Keep the platform stable.

↓

Step 5

Report:

* Objective completed
* Files created
* Files modified
* Summary of implementation
* Recommended next roadmap task

↓

Step 6

STOP.

Wait for the next instruction.

Do not automatically begin another roadmap task.

Complete one roadmap task at a time.

Each completed iteration should leave the HAMIX Platform in a stable, well-organised and maintainable state.

The objective is continuous, incremental progress through many small, reliable improvements rather than large, risky implementations.
