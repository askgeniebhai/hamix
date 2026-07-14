# Proposal: HAMIX Unified Prospect Import Architecture

This document outlines the proposed architecture for expanding lead import capabilities within the HAMIX Platform.

## 1. Unified Prospect Import Pipeline
The pipeline is designed as a multi-stage flow that ensures data quality and prevents duplication before leads reach the CRM.

**Flow:**
`Source Data` -> `Parser/Adapter` -> `Lead Normalizer` -> `AI Deduplication` -> `CRM Storage`

## 2. Component Specifications

### A. Google Search Import
- **Purpose**: Extract leads from standard Google Search result pages.
- **Method**: An adapter that parses text snippets (Meta Titles as Business Names, Snippets as Address/Category hints).
- **File**: `platform/adapters/googleSearch.js`

### B. Chrome Extension Phone Number Import
- **Purpose**: Capture lead data directly from any website visited by the user.
- **Method**: A companion Chrome Extension that scrapes the DOM for phone numbers and business names, sending them to the platform via a clipboard buffer or REST API.
- **File**: `platform/adapters/extensionBridge.js`

### C. CSV/Excel Import
- **Purpose**: Bulk import from external databases.
- **Method**: A flexible mapper allowing users to drag-and-right map CSV headers to HAMIX schema fields. Supports `.csv` and `.xlsx`.
- **File**: `platform/adapters/csvMapper.js`

### D. AI Deduplication Engine
- **Purpose**: Prevent redundant entries that strict string matching might miss.
- **Method**: Uses fuzzy string matching (Levenshtein) and metadata cross-referencing (comparing phone/website even if names differ slightly).
- **Logic**:
    1. Exact Match Check (ID, Phone, Website).
    2. Fuzzy Name Match (e.g., "Star Security" vs "Star Security Ltd").
    3. Human-in-the-loop: Flags "High Confidence" duplicates for automatic merging and "Low Confidence" for manual review.
- **File**: `platform/ai/deduplicator.js`

## 3. Data Schema Consistency
All imports will converge on the `LeadEngine.createLead` schema to ensure the platform remains stable regardless of the data source.

## 4. Required Files for Implementation
- `platform/importManager.js`: The central orchestrator.
- `platform/ui/importWizard.js`: A unified UI for all import methods.
- `platform/adapters/`: Directory for source-specific logic.
- `platform/ai/deduplicator.js`: Logic for duplicate detection.
