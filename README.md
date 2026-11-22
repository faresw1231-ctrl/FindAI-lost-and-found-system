# FindAI – Intelligent Lost & Found Web System
**Abu Dhabi University • Main Campus**  
**Course:** SWE 401: Software Engineering (Fall 2026)  
**Instructor:** Dr. Murad Al-Rajab  
**Presented by:**
- Khalid Yasir (Student ID: 1090684)
- Ali Al Omaira (Student ID: 1092176)
- Fares Farghaly (Student ID: 1092169)

---

## 1. System Overview & Key Changes

The system has been converted to a **pure, simple web application** designed specifically for university software engineering evaluation.

### Key Refinements Implemented:
1. **Dedicated User Login Portals**:
   - Distinct authentication for **Student & Faculty** vs. **Campus Security Staff**.
   - One-click demo login buttons for seamless instructor grading.
2. **Main Campus Focus**:
   - All locations and storage areas are strictly within **Abu Dhabi University Main Campus** (Library, College of Engineering, Student Hub, Sports Complex, Main Security Desk).
3. **Role Architecture (Normal User vs. Staff)**:
   - A **Normal User** (Student / Faculty) can both **log found items** (finder capability) and **claim lost items** (claimant capability).
   - A **Staff User** (Campus Security) has administrative control over claim verification, proof evaluation, locker assignment, and police escalation.
4. **Clean, Solid Visual Design**:
   - Replaced heavy gradients with solid, university-standard colors (Abu Dhabi University Maroon `#800020`, clean slate grays, and clear status badges).
5. **Multi-Model Collaboration (Claude & Gemini)**:
   - **Gemini 1.5 Flash Vision**: Multimodal visual feature extraction and auto-tagging when reporting items.
   - **Claude 3.5 Sonnet**: Conversational search agent with interactive disambiguation when multiple similar items exist.


---

## 3. Demo Credentials for Grading

| User Type | Username | Password | Persona & Privileges |
| :--- | :--- | :--- | :--- |
| **Student / Faculty** | `fares` | `123` | **Fares Farghaly (ID: 1092169)**<br>Access to: AI Search Agent, Browse Inventory. Report Found Item is restricted to Staff. |
| **Campus Security** | `staff` | `123` | **Campus Security Officer (Badge: SEC-401)**<br>Access to: Staff Claim Review, Report Found Item, Storage Management, Item Attribute Editing. |

---

## 4. How to Run the App

download the zip file > extract > open in browser.

---

## 5. Functional Requirements — Implementation Status

| ID | Requirement | Status | Implementation |
| :--- | :--- | :---: | :--- |
| F-01 | Authorized staff upload photo of found item | Met | `tab-log` and `view-log` hidden from students; `switchTab('log')` has StaffUser guard; `handleImageSelection()` + Gemini Vision auto-tags the image |
| F-02 | AI analyzes image — classify type, colour, shape, marks | Met | `AITaggingService.extractVisualTags()` returns brand, color, category, tags, description, isHighValue flag |
| F-03 | Inventory record: unique ID, image, attributes, datetime, storage, Available status | Met | `LostItem` / `HighValueItem` constructor sets all fields; `logItem()` adds to inventory array; `saveInventory()` persists to localStorage |
| F-04 | Natural language description via web interface | Met | AI Search Assistant tab with chat input; `handleUserMessage()` processes free-text queries |
| F-05 | Match description to Available records; return sorted list | Met | `processQuery()` scores each match by keyword hit count and sorts descending before returning candidates |
| F-06 | Follow-up disambiguation questions if multiple matches | Met | `refineWithAnswer()` and `processQuery()` both handle multi-match disambiguation with brand/mark/location questions |
| F-07 | Show candidate details + storage location; hide false-claim info | Met | `renderCandidates()` shows name, brand, color, category, storage only; full description hidden from public. Inventory grid hides description from NormalUser, shows to StaffUser only |
| F-08 | NO MATCH message + offer to edit description | Met | `processQuery()` sets `noMatch: true`; `handleUserMessage()` renders "NO MATCH FOUND" header + "Edit Description" button that re-populates input with last query |
| F-09 | Staff confirms retrieval; status set to Retrieved; excluded from search | Met | `verifyProof()` -> `verifyClaimantProof()` -> `updateStatus('Retrieved')`; Retrieved items excluded in `processQuery()` filter |
| F-10 | Staff must open/approve claim before releasing high-value item | Met | `verifyProof()` blocks approval with alert if `item.claimDetails` is null; Approve/Reject buttons only appear for `Claim Pending` status |
| F-11 | Staff can edit item attributes, storage location, inventory entries | Met | "Edit" button per row in Staff Claim Review table opens `edit-modal`; `submitEdit()` saves name, brand, color, category, storageLocation, description back to inventory |

---

## 6. Non-Functional Requirements — Implementation Notes

| ID | Quality | Criterion | Implementation in Prototype |
| :--- | :--- | :--- | :--- |
| NFR-01 | Performance | 500 items searchable in <3s (95%) | In-memory JS array; `processQuery()` word-match loop is O(n) — well within 3s for 500 items |
| NFR-02 | Performance | Valid form submission creates record in <10s | `handleItemSubmit()` constructs record synchronously; AI tagging mock awaits 500ms; total <1s |
| NFR-03 | Recognition accuracy | 85% category/color accuracy over 100 images | `AITaggingService` mock returns exact brand, color, category for uploaded photo types; real model would use Gemini Vision API |
| NFR-04 | Matching accuracy | Correct item in top-3 results for 85% of test cases | Relevance-scored sort in `processQuery()` ranks highest keyword-overlap items first; disambiguation narrows to 1 |
| NFR-05 | Usability | 8/10 new users perform search in <=2 min | Single-page app; preset query chips; inline chat; "Edit Description" button on no-match; clear tab labels |
| NFR-06 | Security | 100% of unauthorized edit/release actions refused | `switchTab('log')`, `switchTab('staff')`, `verifyProof()`, `openEditModal()`, `submitEdit()`, `updateLocation()` all guard with `instanceof StaffUser` |
| NFR-07 | Privacy | No identifiable claimant info in public search listings | `renderCandidates()` and `renderInventory()` (for NormalUser) omit description field entirely; claim details never shown outside staff dashboard |
| NFR-08 | Reliability | 98% of records accurate across 100 registration/edit/handover events | `saveInventory()` called after every mutation; `loadInventory()` reconstructs proper class instances from JSON on reload |
| NFR-09 | Recovery | 100% of committed records survive restarts | Full inventory persisted to `localStorage` as JSON; rehydrated on `DOMContentLoaded` via `loadInventory()` |
| NFR-10 | Capacity | Store/retrieve at least 500 item records with photos | localStorage ~5MB per origin; 500 records with photo URLs (not blobs) is well within limit |
| NFR-11 | Accessibility | Min 9mm touch targets; readable labels on core actions | Tailwind `py-1.5 px-3` buttons are ~40px tall (>9mm at 96dpi); all inputs have explicit `<label>` elements |
| NFR-12 | Maintainability | AI and inventory components independently mockable | `AITaggingService` and `AISearchAgent` are standalone classes; `FindAIApp` wires them together — each can be tested with mock inputs independently |
