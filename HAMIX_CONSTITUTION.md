# HAMIX Constitution v1.0

## Purpose

HAMIX exists to automate and manage the complete business lifecycle—from discovering a potential customer to becoming that customer's long-term Business Operating System.

HAMIX is **not** just a CRM, website builder, marketing platform, or ERP. It is an AI-powered Business Growth Platform that connects every stage of a customer's journey into one integrated system.

## Mission

Enable businesses to:

* Discover leads
* Qualify opportunities
* Convert prospects into customers
* Deliver digital solutions
* Manage customer success
* Grow through recurring services
* Adopt business automation
* Eventually operate their business on HAMIX

Every engineering decision must move the platform closer to this mission.

## Customer Lifecycle

The canonical HAMIX lifecycle is:

Lead Discovery → Lead Qualification → Sales Pipeline → AI Business Analysis → Proposal Generation → Customer Conversion → Project Discovery → AI Website Generation → Deployment → Customer Success → Business Growth → Business Operating System

Every module must support this lifecycle.

## Fundamental Principles

### 1. Understand Before Building

Before modifying code, understand the business, customer journey, architecture, repository, database, and module connections. Never redesign a system that has not first been understood.

### 2. Business First

Technology exists to support business outcomes. Every feature should have a measurable purpose within the customer lifecycle.

### 3. One Connected Platform

HAMIX must operate as one connected platform. CRM, AI, proposals, websites, deployment, customer success, marketing, and business modules must work together rather than as isolated products.

### 4. Reuse Before Rewrite

Prefer completing and improving existing implementations. Do not replace working code without a valid engineering reason. Avoid unnecessary refactoring.

### 5. Complete Workflows

A feature is complete only when the full workflow functions correctly. A rendered page, visible button, or successful build does not mean the feature is complete.

### 6. One Source of Truth

Each important business entity should exist only once. Examples include Lead, Company, Customer, Proposal, Project, Document, and Invoice. Avoid duplicate business records.

### 7. AI Assists

AI provides recommendations, automation, content generation, analysis, and insights. Final business authority remains with the user unless explicitly delegated.

### 8. Security by Default

Protect customer information, uploaded assets, API credentials, deployment credentials, and business documents. Security defects take priority over cosmetic improvements.

### 9. Evidence-Based Engineering

Implement verified requirements and fix verified defects. Do not invent features or redesign architecture without approval.

### 10. Simplicity

Prefer the simplest correct implementation. Avoid unnecessary complexity, abstractions, or dependencies.

## Engineering Rules

Every implementation should preserve architectural integrity and backward compatibility where practical while reusing existing components, services, APIs, utilities, and design patterns. Avoid duplicate logic.

## Audit Before Implementation

Before making broad changes:

1. Read this Constitution.
2. Study the repository.
3. Understand the business workflow.
4. Map the current implementation.
5. Identify broken or incomplete areas.
6. Produce an execution plan.

Only then begin implementation.

## Quality Standard

HAMIX is complete only when navigation works, buttons work, forms validate, APIs respond correctly, data persists correctly, authentication works, authorization works, business workflows function end to end, responsive layouts are verified, production build succeeds, and runtime testing succeeds.

## Visual Identity

HAMIX should present a consistent, premium, modern business identity. The landing page and internal application must use one coherent design system with professional typography, consistent spacing, accessible colour contrast, modern components, clear navigation, and calm, trustworthy business aesthetics.

## Definition of Done

A task is complete only when the business objective is achieved, the workflow functions end to end, testing has been completed, documentation has been updated where required, no unrelated code has been modified, and the implementation is production-ready.

## Constitutional Rule for Codex

Before every implementation, ask:

1. Do I understand the HAMIX business?
2. Do I understand the existing implementation?
3. Am I improving what already exists rather than replacing it?
4. Does this strengthen the customer lifecycle?
5. Does this preserve architectural integrity?
6. Can this be verified end to end?

If the answer to any question is **No**, stop, investigate further, and report the findings before proceeding.

This Constitution is the governing document for all HAMIX engineering work.
