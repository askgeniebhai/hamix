# NSF MIGRATION - CROSS-PROJECT DEPENDENCIES

## Identified Shared Dependencies
The following files in the HAMIX project contain references to NSF components that have been moved during this restructuring. These files have NOT been modified to comply with the "Protect HAMIX" safety requirement.

### 1. `platform/app.js`
*   **Location:** Line 721
*   **Current Code:** `window.open('guard-portal.html', '_blank');`
*   **Status:** **BROKEN**. The file `guard-portal.html` no longer exists in the root.
*   **Required Update:** `window.open('../nsf/portals/guard.html', '_blank');`
*   **Reason for Skipping:** This file is part of the HAMIX CRM main branch and is outside the permitted development workspace (`/nsf`).

### 2. `platform/index.html` (Navigation)
*   **Location:** Sidebar links for Attendance.
*   **Status:** The "Attendance" link in the CRM sidebar points to an internal page that previously hosted the `guard-portal.html` launcher.
*   **Recommendation:** Post-migration, an authorized HAMIX administrator should update this link to point to the new NSF Portal.

## Proposed Migration Approach
To maintain zero impact on HAMIX while finalizing the NSF migration:
1.  Complete the NSF migration within the `/nsf` directory.
2.  Provide this dependency list to the project owner.
3.  Execute a coordinated update of the HAMIX-side links only after the new NSF structure is verified and approved.
