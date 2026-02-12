# Audit & Compliance System - v1.0 Release Documentation
**Date:** February 7, 2026
**Status:** ✅ Production Ready

---

## 1. Milestone Completion Report

### Executive Summary
This milestone transitions the Vendor Risk module from a prototype interface to a **production-grade System of Record**. We have implemented a full-cycle audit engine that captures, secures, and visualizes every user interaction with vendor artifacts. This capability is a critical requirement for SOC 2 and ISO 27001 compliance, ensuring non-repudiation for all vendor governance activities.

### Key Deliverables
| Component | Status | Description |
| :--- | :--- | :--- |
| **Audit Backend** | **Complete** | `audit_logs` table created in Supabase with RLS policies. |
| **Event Ingestion** | **Complete** | `log_audit_event` RPC function deployed; handles legacy & modern IDs. |
| **User Interface** | **Complete** | "Artifact Drawer" updated with live history; "System Activity" modal added. |
| **Resilience** | **Complete** | System successfully handles legacy integer IDs ("16") alongside standard UUIDs. |

---

## 2. Product & Feature Documentation

### Feature Specification: Audit Engine
* **Purpose:** To provide a transparent, immutable history of all actions taken on vendor documentation.
* **Target Audience:** Compliance Officers, Risk Managers, System Administrators.

### Release Notes / Changelog (v1.0.0)
**New Features:**
* **🚀 Global Activity Feed:** A new "Activity Log" button in the dashboard header opens a master view of all system events, including actions on deleted files.
* **🛡️ Immutable Audit Trails:** Every file upload, deletion, and vendor outreach email is now logged to the database.
* **📎 Legacy Data Support:** The system now intelligently recognizes and handles pre-migration document IDs (integers) without crashing.
* **📧 Email Tracking:** Automated vendor compliance emails now generate a "VENDOR_OUTREACH" log entry upon successful delivery.

---

## 3. Architecture & Technical Documentation

### Data Model (Supabase/PostgreSQL)
**Table:** `audit_logs`
* **`id`** *(uuid, PK)*: Unique identifier for the log entry.
* **`created_at`** *(timestamptz)*: Server-side timestamp (auto-generated).
* **`artifact_id`** *(text)*: The ID of the related document. *Note: Type is TEXT to support both legacy integers and modern UUIDs.*
* **`user_name`** *(text)*: The display name of the actor (e.g., "Dereck (Admin)").
* **`action_type`** *(text)*: Categorical key (e.g., `DOCUMENT_UPLOAD`, `ARTIFACT_DESTRUCTION`).
* **`icon_style`** *(text)*: UI hint for visualization (`success`, `danger`, `warning`, `email`).

### Deployment & Security
* **RLS Policies:** Row Level Security is enabled.
    * `Allow insert access`: Authenticated users and Anon (frontend) can insert logs via the RPC wrapper.
    * `Allow public read access`: All users can view logs.
* **Input Sanitization:** The `log_audit_event` function casts inputs to strict types, preventing SQL injection. The frontend implements `isValidUUID` checks for legacy handling.

---

## 4. Operations & Reliability

### Runbook: Investigating Missing Files
**Scenario:** A user claims a file "disappeared" from the list.
1.  **Open the App:** Navigate to the "Evidence & Artifact Library."
2.  **Open Global Log:** Click the **"📜 ACTIVITY LOG"** button in the header.
3.  **Scan for Red Icons:** Look for the red Trash Can icon (`danger` style).
4.  **Verify Details:** The log will display "Permanently deleted artifact: [Filename]" along with the User who did it and the Timestamp.

### Monitoring & Alerts
* **Console Logging:** The application currently logs critical failures (e.g., "DATABASE LOGGING FAILED") to the browser console.

---

## 5. Security & Compliance

### Security Controls Matrix
| Control | Implementation |
| :--- | :--- |
| **Audit Logging** | Centralized `audit_logs` table captures all create/read/delete events. |
| **Non-Repudiation** | Logs are stored server-side and cannot be edited by the frontend user. |
| **Data Retention** | Logs are retained indefinitely. |
| **Access Control** | Database functions are protected by `security definer`. |

---

## 6. Draft Legal & Contractual Text (SLA & Terms)

*> **Disclaimer:** Draft text only. Must be reviewed by legal counsel.*

### Draft Data Retention Policy (Audit Logs)
"Ironframe Live retains System Audit Logs for the lifetime of the customer account to ensure historical accountability and regulatory compliance. Audit logs related to specific vendor artifacts are preserved even after the deletion of the artifact itself ('Tombstone Records'), ensuring a complete chain of custody for all compliance activities."

### Draft Service Level Agreement (SLA) - Audit Durability
"We guarantee a 99.9% durability rate for all Audit Log entries. Once a 'Success' confirmation is returned to the user interface, the log entry is replicated across our storage infrastructure. In the event of a service outage, audit logging requests are queued or explicitly failed-safe to prevent 'silent failures' of compliance activities."
