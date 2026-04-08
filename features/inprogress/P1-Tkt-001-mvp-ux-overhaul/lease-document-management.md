# Feature: Lease & Document Management

**ID**: P1-Tkt-001 (Work Stream 3)
**Ticket**: T-016
**Phase**: 1 — MVP
**Parent**: [P1-Tkt-001-mvp-ux-overhaul](./README.md)

## TL;DR

Track lease details per tenant (type, dates, rent due day) and manage property-related documents (lease agreements, receipts, inspection photos, property photos) in a new `property-documents` storage bucket. Extends the existing tenant form with lease fields, adds a reusable document uploader component, and surfaces a filterable document gallery on each property's detail view.

## Summary

Today a landlord can add tenants with basic contact info (name, email, phone, unit number) but has no way to record lease terms or attach documents to properties. Lease agreements, receipts from repairs, and inspection photos live outside the app -- in email, filing cabinets, or phone camera rolls. This makes it hard to answer basic questions: "When does Jane's lease expire?" or "Do I have the move-in photos for Unit 2B?"

This feature adds three capabilities:

1. **Lease tracking** -- Extend the tenants table with lease fields (type, start/end dates, rent due day, move-in date). These fields appear in both the onboarding wizard tenant step (Step 3) and the standalone tenant form on the Properties page.

2. **Document management** -- A new `documents` table and `property-documents` storage bucket. A reusable `DocumentUploader` component handles file selection with document-type categorization. Supported types: lease agreement, receipt, move-in photos, move-out photos, property photos, and other.

3. **Document gallery** -- A per-property gallery view showing uploaded documents organized by type, with photo thumbnails and PDF/document icons. Filterable by document type. Click to preview images or download files.

This is foundational for P2-001 (rent reminders need `rent_due_day`), and for any future audit trail or compliance features that need document proof.

## User Stories

### Landlord

- As a landlord, I want to record lease type (yearly or month-to-month) for each tenant so I know which leases need renewal attention.
- As a landlord, I want to set lease start and end dates so I can see at a glance when leases expire.
- As a landlord, I want to record the rent due day (1st-28th) per tenant so the rent reminder system (P2-001) knows when to send alerts.
- As a landlord, I want to record a move-in date for each tenant so I have a clear tenancy timeline.
- As a landlord, I want to upload lease agreements, receipts, and inspection photos per property so all my documents are in one place.
- As a landlord, I want to categorize each uploaded document (lease, receipt, move-in photos, move-out photos, property photos, other) so I can filter and find them quickly.
- As a landlord, I want to view all documents for a property in a gallery grid, filterable by type, so I can find what I need without scrolling through everything.
- As a landlord, I want to click a document thumbnail to preview images or download PDFs.
- As a landlord, I want to associate a document with a specific tenant (optional) so I can see which lease belongs to which tenant.
- As a landlord, I want to see a tenant's current lease info (type, dates, status) on the properties page so I do not have to navigate elsewhere.

## Architecture

```
Tenant Form (enhanced) -----> PATCH /api/tenants/[id] -----> tenants table (new columns)
Onboarding Step 3 (enhanced) -> POST /api/properties/[id]/tenants -> tenants table

DocumentUploader -----> POST /api/documents/upload -----> property-documents bucket
                                                    |---> documents table

Document Gallery -----> GET /api/properties/[id]/documents -----> documents table
                  |---> GET signed URL (Supabase Storage) -----> property-documents bucket

Document Delete  -----> DELETE /api/documents/[id] -----> documents table + storage cleanup
```

### New API Routes

```
POST   /api/documents/upload              Upload file(s) to property-documents bucket + insert documents row(s)
GET    /api/properties/[id]/documents     List documents for a property (with optional ?type= filter)
DELETE /api/documents/[id]                Delete a document (remove storage file + DB row)
GET    /api/documents/[id]/url            Get a signed download/preview URL for a document
```

### Modified API Routes

```
POST   /api/properties/[id]/tenants      Now accepts lease fields
PATCH  /api/tenants/[id]                  Now accepts lease fields
GET    /api/tenants/[id]                  Now returns lease fields
```

### New File Structure

```
apps/web/
├── app/api/
│   ├── documents/
│   │   ├── upload/route.ts              Upload endpoint (multipart/form-data)
│   │   └── [id]/
│   │       ├── route.ts                 DELETE document
│   │       └── url/route.ts             GET signed URL
│   └── properties/[id]/
│       └── documents/route.ts           GET documents list
├── components/
│   ├── documents/
│   │   ├── document-uploader.tsx         Reusable upload component with type picker
│   │   ├── document-gallery.tsx          Grid gallery with type filter tabs
│   │   ├── document-card.tsx             Single document thumbnail/icon card
│   │   └── document-preview-dialog.tsx   Full-screen image preview / download trigger
│   └── forms/
│       └── tenant-form.tsx              (modified -- add lease fields)
├── components/onboarding/
│   └── onboarding-wizard.tsx            (modified -- lease fields in Step 3 tenant form)
└── lib/
    ├── types.ts                         (modified -- extend Tenant, add Document type)
    └── validations.ts                   (modified -- extend tenantSchema, add documentSchema)
```

## Tech Approach

### Lease Fields on Tenants

Add columns directly to the `tenants` table rather than creating a separate `leases` table. Rationale: MVP targets small landlords (1-20 units), each tenant has at most one active lease, and a separate table adds join complexity for no benefit. If multi-lease history is needed later (Phase 2+), a `lease_history` table can be added at that point.

The tenant form (`TenantForm`) gains a collapsible "Lease Details" section with:
- **Lease type**: `Select` dropdown (Yearly, Month-to-Month)
- **Lease start date**: `Input type="date"` (native date picker -- sufficient for MVP, no need for a date picker library)
- **Lease end date**: `Input type="date"` (conditionally required when lease type is "yearly")
- **Rent due day**: `Select` dropdown (1st through 28th -- capped at 28 to avoid month-length edge cases)
- **Move-in date**: `Input type="date"`

The same fields also appear in the onboarding wizard Step 3 tenant inline form, but collapsed/optional so onboarding stays fast.

### Document Upload

Extend the existing upload pattern from `/api/upload/route.ts` (which handles `request-photos`). The new `/api/documents/upload` route:

1. Authenticates via Clerk (`auth()`)
2. Accepts `multipart/form-data` with: `files` (File[]), `property_id` (string), `document_type` (string), `tenant_id` (string, optional), `description` (string, optional)
3. Validates file count (max 10 per upload), file size (max 10 MB each), and allowed types (images, PDFs, common document formats)
4. Uploads each file to the `property-documents` Supabase Storage bucket under path `{landlord_id}/{property_id}/{timestamp}-{uuid}.{ext}`
5. Inserts a row into the `documents` table for each file
6. Returns the created document records

**Allowed file types**: `image/*` (JPEG, PNG, HEIC, WebP), `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Document Gallery

A `DocumentGallery` component that:
- Fetches documents via `GET /api/properties/[id]/documents`
- Displays filter tabs using shadcn `Tabs`: All, Leases, Receipts, Move-in, Move-out, Property Photos, Other
- Renders a responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop)
- Each `DocumentCard` shows: thumbnail (for images), file-type icon (for PDFs/docs), file name, upload date, optional tenant name
- Click opens `DocumentPreviewDialog`: full-size image with zoom, or download button for non-image files
- Delete button on each card (with confirmation dialog)

### Signed URLs

Documents in `property-documents` bucket are private (not public). The `/api/documents/[id]/url` route:
1. Verifies the requesting user owns the document (via `landlord_id` match)
2. Calls `supabase.storage.from('property-documents').createSignedUrl(path, 3600)` (1-hour expiry)
3. Returns the signed URL

For the gallery thumbnail grid, the component fetches signed URLs in batch on mount (or lazily as thumbnails scroll into view).

### Reusing PhotoUploader Patterns

The existing `PhotoUploader` component at `components/forms/photo-uploader.tsx` is image-only (accepts `image/*`, uses `capture="environment"`). Rather than modifying it (which would break the maintenance request flow), we create a new `DocumentUploader` component that:
- Accepts broader file types (images + PDFs + documents)
- Includes a document-type `Select` dropdown
- Supports optional description text
- Has a higher file limit (10 instead of 5)
- Shows file-type-aware previews (image thumbnails vs. PDF icons)
- The original `PhotoUploader` remains untouched for maintenance requests

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design document-uploader              # Phase 1: Plan DocumentUploader + DocumentGallery
/ui-build document-uploader               # Phase 2: Build from plan
/ui-refine DocumentUploader               # Phase 3: Polish interactions, loading states

/ux-design enhanced-tenant-form           # Phase 1: Plan lease field additions
/ui-build enhanced-tenant-form            # Phase 2: Build from plan
/ui-refine TenantForm                     # Phase 3: Polish, ensure onboarding consistency
```

### Screen 1: Enhanced Tenant Form

**Context**: Appears in two places -- the Sheet on `/properties` page and inline in onboarding wizard Step 3.

**Lease Details Section** (collapsible, below existing contact fields):

```
+-----------------------------------------------+
| Full Name *              [Jane Smith        ]  |
| Email                    [jane@example.com  ]  |
| Phone                    [512-555-0100      ]  |
| Unit Number *            [2B                ]  |
|                                                 |
| v Lease Details (optional)                      |
| ┌─────────────────────────────────────────────┐ |
| │ Lease Type       [Yearly          v]        │ |
| │ Lease Start      [2024-03-01      ]         │ |
| │ Lease End        [2025-02-28      ]         │ |
| │ Rent Due Day     [1st             v]        │ |
| │ Move-in Date     [2024-03-01      ]         │ |
| └─────────────────────────────────────────────┘ |
|                                                 |
|              [Save Tenant]  [Cancel]            |
+-----------------------------------------------+
```

**Component hierarchy**:

```
TenantForm (components/forms/tenant-form.tsx) -- MODIFIED
├── Contact fields (existing: name, email, phone, unit_number)
├── Collapsible "Lease Details"
│   ├── Select: lease_type (Yearly | Month-to-Month)
│   ├── Input type="date": lease_start_date
│   ├── Input type="date": lease_end_date (hidden if month-to-month)
│   ├── Select: rent_due_day (1-28)
│   └── Input type="date": move_in_date
└── SheetFooter (Save / Cancel)
```

**shadcn components used**: `Input`, `Label`, `Select`, `Collapsible`, `Button`, `Sheet` (parent)

**Responsive strategy**: Single column on mobile. The date fields stack vertically. On tablet+, lease start/end dates sit side-by-side in a 2-column grid.

**Onboarding variant**: In the onboarding wizard Step 3 inline tenant form, the lease fields appear in the same collapsible pattern. Default collapsed so onboarding stays fast. A subtle hint text: "You can add lease details now or later from the Properties page."

### Screen 2: Document Upload Section (DocumentUploader)

**Context**: Reusable component. Initially used on the property detail page. Future use in dashboard drill-down, tenant detail.

```
+-----------------------------------------------+
| Upload Documents                                |
|                                                 |
| Document Type    [Lease Agreement      v]       |
| Description      [Signed lease for 2B   ]      |
| Tenant (optional) [Jane Smith - Unit 2B v]      |
|                                                 |
| ┌─────────────────────────────────────────────┐ |
| │  +------------------+                       │ |
| │  | [+] Choose Files |  Drag & drop or click │ |
| │  +------------------+                       │ |
| │                                              │ |
| │  lease-2b.pdf (2.3 MB)         [x]          │ |
| │  receipt-plumber.jpg (1.1 MB)  [x]          │ |
| │                                              │ |
| │  2/10 files selected                         │ |
| └─────────────────────────────────────────────┘ |
|                                                 |
|              [Upload]  [Cancel]                 |
+-----------------------------------------------+
```

**Component hierarchy**:

```
DocumentUploader (components/documents/document-uploader.tsx)
├── Select: document_type (lease | receipt | inspection_move_in | inspection_move_out | property_photo | other)
├── Input: description (optional, text)
├── Select: tenant_id (optional, populated from property's tenants)
├── File drop zone / file input
│   ├── Accepts: image/*, application/pdf, .doc, .docx
│   ├── Max 10 files, 10 MB each
│   └── File list with name, size, remove button
│       ├── Image files: small thumbnail preview
│       └── PDF/doc files: file-type icon (FileText from lucide)
├── Upload progress bar (during upload)
└── Button: Upload (triggers POST /api/documents/upload)
```

**shadcn components used**: `Select`, `Input`, `Button`, `Progress`, `Card`

**Responsive strategy**: Full-width on mobile. File list stacks vertically. On desktop, the metadata fields (type, description, tenant) can sit in a 2-column grid above the file drop zone.

**User flow**:
1. Landlord selects document type from dropdown
2. Optionally adds description and links to a tenant
3. Clicks "Choose Files" or drags files onto the drop zone
4. Files appear in a list with previews and remove buttons
5. Clicks "Upload" -- progress bar shows upload status
6. On success, toast notification, files appear in gallery below

### Screen 3: Document Gallery (DocumentGallery)

**Context**: Per-property view. Shown as a tab/section on the property detail page.

```
+-----------------------------------------------+
| Documents for Oak Street Duplex                 |
|                                                 |
| [All] [Leases] [Receipts] [Move-in] [Move-out] |
| [Property Photos] [Other]                       |
|                                                 |
| ┌──────────┐ ┌──────────┐ ┌──────────┐         |
| │ [thumb]  │ │ [PDF]    │ │ [thumb]  │         |
| │          │ │  icon    │ │          │         |
| │ Move-in  │ │ Lease    │ │ Property │         |
| │ photo 1  │ │ 2B.pdf   │ │ front    │         |
| │ Apr 2024 │ │ Mar 2024 │ │ Jan 2024 │         |
| │ Jane S.  │ │ Jane S.  │ │          │         |
| │    [...]  │ │    [...]  │ │    [...]  │         |
| └──────────┘ └──────────┘ └──────────┘         |
|                                                 |
| ┌──────────┐ ┌──────────┐                       |
| │ [thumb]  │ │ [thumb]  │                       |
| │          │ │          │                       |
| │ Receipt  │ │ Move-out │                       |
| │ plumber  │ │ photo 1  │                       |
| │ Feb 2024 │ │ Mar 2024 │                       |
| │          │ │ John D.  │                       |
| │    [...]  │ │    [...]  │                       |
| └──────────┘ └──────────┘                       |
|                                                 |
| Showing 5 documents                             |
+-----------------------------------------------+
```

**Component hierarchy**:

```
DocumentGallery (components/documents/document-gallery.tsx)
├── Tabs (filter by document_type)
│   ├── TabsTrigger: All, Leases, Receipts, Move-in, Move-out, Property Photos, Other
│   └── TabsContent
│       └── Grid (responsive: 2/3/4 cols)
│           └── DocumentCard[] (components/documents/document-card.tsx)
│               ├── Thumbnail (image) or FileType icon (PDF/doc)
│               ├── Document type badge
│               ├── File name (truncated)
│               ├── Upload date
│               ├── Tenant name (if associated)
│               ├── DropdownMenu: [...] -> Preview, Download, Delete
│               └── onClick -> DocumentPreviewDialog
└── Empty state (when no documents / no documents of selected type)
```

**shadcn components used**: `Tabs`, `Card`, `Badge`, `DropdownMenu`, `Dialog` (for preview), `AlertDialog` (for delete confirmation), `Skeleton` (loading state)

**Responsive strategy**: 2-column grid on mobile (compact cards), 3 columns on tablet, 4 columns on desktop. Filter tabs scroll horizontally on mobile. Cards have consistent aspect ratio (4:3 for thumbnails).

### Screen 4: Property Detail Documents Tab

**Context**: The properties page currently shows property cards with collapsible tenant lists. This feature adds a way to view/upload documents per property. Since there is no dedicated property detail page yet, the document gallery is accessed via a new "Documents" button on each property card, which opens a Sheet (slide-over panel) or navigates to a property detail route.

**Approach A (Sheet, simpler for MVP)**:

```
Property Card
├── Header: name, badge, address, edit/delete buttons
├── Collapsible: Tenants (existing)
├── Button: "Documents (3)" -> opens Sheet
│   └── Sheet (right panel, wide)
│       ├── SheetHeader: "Documents - Oak Street Duplex"
│       ├── DocumentUploader (collapsed by default, expand to upload)
│       └── DocumentGallery (main content)
└── Collapsible: Tenants (existing)
```

**Approach B (Dedicated route, better long-term)**:

```
/properties/[id]                          Property detail page
├── PageHeader: property name + breadcrumb
├── Tabs
│   ├── "Overview" tab: property info, tenant list (existing UI refactored)
│   ├── "Documents" tab: DocumentUploader + DocumentGallery
│   └── "Maintenance" tab: (future -- requests filtered to this property)
```

**Recommendation**: Use Approach A (Sheet) for MVP. It avoids creating a new route and page while the property card UI is still simple. If P1-005 (dashboard drill-down) introduces a property detail page, the gallery component can be moved there as a tab. The `DocumentGallery` and `DocumentUploader` components are built as standalone, so they work in either context.

**Component hierarchy (Approach A)**:

```
PropertiesPage (modified)
├── Property Card
│   ├── (existing content)
│   ├── Button: "Documents (N)" -- shows count from a lightweight count endpoint or client-side fetch
│   └── triggers SheetMode: { type: "property-documents", propertyId: string }
└── Sheet
    ├── SheetHeader: "Documents - {property.name}"
    ├── Collapsible: "Upload New Document"
    │   └── DocumentUploader (property_id pre-set, tenants pre-loaded)
    └── DocumentGallery (property_id)
```

### Screen 5: Tenant Lease Card

**Context**: On the properties page, within the tenant row inside the collapsible, show lease summary info inline.

```
┌──────────────────────────────────────────────┐
│ [User] Jane Smith            [Unit 2B]       │
│ jane@example.com  512-555-0100               │
│                                               │
│ Lease: Yearly  |  Mar 2024 - Feb 2025       │
│ Rent due: 1st  |  Status: Active             │
│                              [Edit] [Delete]  │
└──────────────────────────────────────────────┘
```

If no lease info is set, this section simply does not render (no empty state needed -- contact info alone is sufficient).

**Lease status derivation** (computed client-side, not stored):
- **Active**: `lease_end_date` is null (month-to-month) or `lease_end_date >= today`
- **Expiring Soon**: `lease_end_date` is within 60 days
- **Expired**: `lease_end_date < today`

**Component hierarchy**:

```
Tenant row in PropertiesPage (modified)
├── (existing: name, unit badge, email, phone)
├── Lease summary line (conditional, only if lease_type is set)
│   ├── Lease type label
│   ├── Date range (start - end, or "Month-to-month" with start only)
│   ├── Rent due day
│   └── Status badge: Active (green), Expiring Soon (yellow), Expired (red)
└── (existing: edit/delete buttons)
```

**shadcn components used**: `Badge` (for status)

## Data Model

### Extend Table: `tenants`

```sql
alter table tenants
  add column lease_type text,
    -- 'yearly' | 'month_to_month' | null (not set yet)
  add column lease_start_date date,
  add column lease_end_date date,
    -- null for month-to-month leases
  add column rent_due_day int,
    -- 1-28 (day of month), null if not set
  add column move_in_date date;

-- Validate rent_due_day range
alter table tenants
  add constraint tenants_rent_due_day_check
  check (rent_due_day is null or (rent_due_day >= 1 and rent_due_day <= 28));

-- Validate lease_type values
alter table tenants
  add constraint tenants_lease_type_check
  check (lease_type is null or lease_type in ('yearly', 'month_to_month'));
```

### New Table: `documents`

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  tenant_id uuid references tenants,           -- nullable: not all docs are tenant-specific
  landlord_id text not null,                    -- Clerk user ID (for RLS + ownership checks)

  document_type text not null,
    -- 'lease' | 'receipt' | 'inspection_move_in' | 'inspection_move_out' | 'property_photo' | 'other'
  storage_path text not null,                   -- path within property-documents bucket
  file_name text not null,                      -- original file name
  file_type text not null,                      -- MIME type (image/jpeg, application/pdf, etc.)
  file_size int not null,                       -- bytes
  description text,                             -- optional user-provided description

  uploaded_at timestamptz default now()
);

-- Index for gallery queries (by property, by type)
create index idx_documents_property_id on documents(property_id);
create index idx_documents_property_type on documents(property_id, document_type);
create index idx_documents_tenant_id on documents(tenant_id);

-- Validate document_type values
alter table documents
  add constraint documents_type_check
  check (document_type in ('lease', 'receipt', 'inspection_move_in', 'inspection_move_out', 'property_photo', 'other'));
```

### New Supabase Storage Bucket

```sql
insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false);
```

Private bucket (not public). All access goes through signed URLs generated server-side after ownership verification.

### TypeScript Types

```typescript
// Extend existing Tenant type
export interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unit_number: string | null;
  property_id: string;
  clerk_user_id?: string | null;
  // New lease fields
  lease_type: 'yearly' | 'month_to_month' | null;
  lease_start_date: string | null;   // ISO date string (YYYY-MM-DD)
  lease_end_date: string | null;     // ISO date string, null for month-to-month
  rent_due_day: number | null;       // 1-28
  move_in_date: string | null;       // ISO date string
}

export type DocumentType =
  | 'lease'
  | 'receipt'
  | 'inspection_move_in'
  | 'inspection_move_out'
  | 'property_photo'
  | 'other';

export interface Document {
  id: string;
  property_id: string;
  tenant_id: string | null;
  landlord_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string | null;
  uploaded_at: string;
  // Joined fields (optional, from API responses)
  tenant_name?: string | null;
}
```

### Zod Validation Updates

```typescript
// Extend tenantSchema
export const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  unit_number: z.string().max(20).optional().or(z.literal("")),
  // New lease fields (all optional)
  lease_type: z.enum(["yearly", "month_to_month"]).optional().nullable(),
  lease_start_date: z.string().optional().nullable(),  // YYYY-MM-DD
  lease_end_date: z.string().optional().nullable(),
  rent_due_day: z.number().int().min(1).max(28).optional().nullable(),
  move_in_date: z.string().optional().nullable(),
});

// New document upload schema
export const documentUploadSchema = z.object({
  property_id: z.string().uuid(),
  document_type: z.enum([
    "lease", "receipt", "inspection_move_in",
    "inspection_move_out", "property_photo", "other",
  ]),
  tenant_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().or(z.literal("")),
});
```

## Integration Points

### 1. P1-003: Onboarding Wizard (Step 3 -- Tenants)

The onboarding wizard Step 3 inline tenant form (`onboarding-wizard.tsx`) currently collects name, email, phone, unit_number. It needs to be extended with an optional, collapsed "Lease Details" section.

**Changes**:
- Add lease fields to `TenantEntry` interface in the wizard
- Add a collapsible lease section to the inline tenant form
- The `handleSaveAll` function already POSTs to `/api/properties/[id]/tenants` -- the API just needs to accept the new fields
- Keep lease fields collapsed by default so the onboarding flow stays fast

### 2. P1-005: Dashboard Drill-Down (future)

P1-005 will add property detail drill-down from the dashboard. When that feature is built:
- The `DocumentGallery` component can be embedded as a tab on the property detail page
- The `DocumentUploader` component can be placed above the gallery
- No code changes needed in P1-006 components -- they accept `propertyId` as a prop and work standalone

### 3. P2-001: Rent Reminders

The `rent_due_day` field on tenants is a direct prerequisite for rent reminders. P2-001 will:
- Query `tenants.rent_due_day` to determine when to send reminders
- Use `lease_type` to adjust reminder frequency (yearly leases may have different reminder cadence)
- Use `lease_end_date` to stop reminders for expired leases

**No dependency from P1-006 on P2-001** -- P1-006 just stores the data. P2-001 consumes it.

### 4. Existing Upload Route (`/api/upload`)

The existing `/api/upload` route uses the `request-photos` bucket for maintenance request photos. It remains untouched. The new `/api/documents/upload` route is a separate endpoint targeting the `property-documents` bucket with different validation rules (more file types, higher file count, document metadata).

### 5. Existing Tenant API Routes

`POST /api/properties/[id]/tenants` and `PATCH /api/tenants/[id]` need to be updated to accept and validate the new lease fields. The changes are additive -- all new fields are optional, so existing callers (including the current onboarding wizard before it is updated) continue to work.

## Manual Testing Checklist

### Lease Fields -- Tenant Form (Properties Page)

- [ ] Open tenant form via "Add Tenant" on a property -- lease section is collapsed
- [ ] Expand lease section -- all 5 fields visible (type, start, end, due day, move-in)
- [ ] Select "Yearly" as lease type -- lease end date field is visible
- [ ] Select "Month-to-Month" -- lease end date field is hidden
- [ ] Set rent due day to 15th -- saved correctly to DB
- [ ] Set all lease fields, save tenant -- fields persist after page refresh
- [ ] Edit existing tenant -- lease fields pre-populated correctly
- [ ] Save tenant with no lease fields -- works (all optional)
- [ ] Lease end date validation: cannot be before lease start date

### Lease Fields -- Onboarding Wizard (Step 3)

- [ ] Add a tenant in Step 3 -- lease section is collapsed by default
- [ ] Expand lease section, fill in fields, add tenant -- appears in list
- [ ] Complete onboarding -- tenant created with lease fields in DB
- [ ] Skip lease fields entirely -- tenant created without lease data (all null)

### Tenant Lease Card (Properties Page)

- [ ] Tenant with lease info: shows "Yearly | Mar 2024 - Feb 2025 | Due: 1st | Active"
- [ ] Tenant with month-to-month: shows "Month-to-Month | Started Mar 2024 | Due: 15th | Active"
- [ ] Tenant with lease ending in <60 days: status badge shows "Expiring Soon" (yellow)
- [ ] Tenant with expired lease: status badge shows "Expired" (red)
- [ ] Tenant with no lease info: no lease line shown (just contact info)

### Document Upload

- [ ] Open document upload for a property
- [ ] Select document type "Lease Agreement" -- dropdown works
- [ ] Select a tenant from optional tenant dropdown
- [ ] Add description text
- [ ] Choose an image file -- thumbnail preview appears
- [ ] Choose a PDF file -- file icon + name appears
- [ ] Choose multiple files (up to 10) -- all listed with remove buttons
- [ ] Remove a file from the list -- removed correctly
- [ ] Attempt to add more than 10 files -- prevented
- [ ] Attempt to upload a file >10 MB -- error shown
- [ ] Click Upload -- progress indicator, toast on success
- [ ] After upload, document appears in gallery below

### Document Gallery

- [ ] Gallery loads documents for a property -- grid of thumbnails/icons
- [ ] Image documents show thumbnail previews
- [ ] PDF documents show PDF icon
- [ ] Filter tabs: click "Leases" -- only lease documents shown
- [ ] Filter tabs: click "All" -- all documents shown
- [ ] Empty filter: click "Move-out" when none exist -- empty state message
- [ ] Click a document card -- preview dialog opens
- [ ] Image preview: full-size image displayed
- [ ] PDF: download button works
- [ ] Delete a document: confirmation dialog, then removed from gallery and storage

### Property Documents Button (Properties Page)

- [ ] "Documents (3)" button shows correct count per property
- [ ] Click button -- Sheet opens with uploader + gallery
- [ ] Upload a document from the Sheet -- gallery refreshes
- [ ] Delete a document from the Sheet -- gallery refreshes, count updates

### Edge Cases

- [ ] Property with no documents -- gallery shows empty state
- [ ] Upload with no files selected -- upload button disabled
- [ ] Upload fails (network error) -- error toast, files still in list for retry
- [ ] Delete a document that was already deleted (race condition) -- graceful 404 handling
- [ ] Signed URL expiry -- after 1 hour, re-fetch generates new URL
- [ ] Very long file names -- truncated with ellipsis in gallery cards
- [ ] Upload a .heic image (iPhone photo) -- handled correctly

### Responsive Design

- [ ] Mobile (375px): 2-column gallery grid, filter tabs scroll horizontally
- [ ] Tablet (768px): 3-column grid, all tabs visible
- [ ] Desktop (1280px): 4-column grid, spacious layout
- [ ] Document upload Sheet: full-screen on mobile, side panel on desktop

## Tasks

Tasks are outlined below. Detailed task files will be generated in `backlog/` by `/create-feature-tasks-in-backlog`.

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration -- extend tenants table with lease columns | -- |
| 2 | Haiku | Database migration -- create documents table + property-documents bucket | -- |
| 3 | Haiku | Update TypeScript types + Zod schemas for lease fields and documents | 1, 2 |
| 4 | Sonnet | Update tenant API routes to accept and return lease fields | 1, 3 |
| 5 | Sonnet | Build document upload API route (POST /api/documents/upload) | 2, 3 |
| 6 | Sonnet | Build document list API route (GET /api/properties/[id]/documents) | 2, 3 |
| 7 | Sonnet | Build document delete + signed URL API routes | 2, 3 |
| 8 | Opus | Enhance TenantForm with collapsible lease fields section | 3, 4 |
| 9 | Opus | Enhance onboarding wizard Step 3 with lease fields | 8 |
| 10 | Opus | Build DocumentUploader component | 5 |
| 11 | Opus | Build DocumentGallery + DocumentCard components | 6, 7 |
| 12 | Opus | Build DocumentPreviewDialog component | 7 |
| 13 | Opus | Add tenant lease card (inline lease summary on properties page) | 4, 8 |
| 14 | Opus | Add property documents Sheet to properties page (uploader + gallery) | 10, 11, 12 |
| 15 | Haiku | Update endpoints.md with new API routes | 5, 6, 7 |

**Tier breakdown**: 3 Haiku, 4 Sonnet, 8 Opus
**Dependency graph**: Tasks 1 + 2 are independent foundations -> 3 depends on both -> 4-7 (API routes) depend on 3 -> 8-14 (UI) depend on APIs -> 15 is a documentation cleanup at the end

**Front-end tasks are Opus** (per project rules). API routes are Sonnet (guided implementation with clear schema). Migrations, types, and docs are Haiku (routine scaffolding).

## Open Questions

1. **Property detail page vs. Sheet for documents?** -- Recommendation: use the Sheet pattern for MVP (Approach A in UI section). It keeps documents accessible without creating a new route. When P1-005 adds a property detail page, the gallery component can be moved there as a tab with no refactor needed.

2. **Document version history?** -- Not for MVP. If a landlord uploads a new lease for the same tenant, both versions appear in the gallery. A future enhancement could add "replaces" linking between document versions.

3. **Bulk document upload UX?** -- The uploader supports up to 10 files per upload. All files in one upload share the same document type and tenant association. If a landlord needs to upload mixed types, they do separate uploads. This keeps the UX simple for MVP.

4. **Lease renewal workflow?** -- Not in scope. When a lease is renewed, the landlord manually updates the tenant's lease dates and uploads the new lease document. An automated renewal reminder (like rent reminders) could be part of P2-001 or a separate P2 feature.

5. **Max storage per landlord?** -- Not enforced in MVP. Supabase Storage pricing is usage-based. If abuse becomes a concern, add a storage quota check in the upload route (e.g., 500 MB per landlord for the free tier). This can be added without schema changes.

6. **Document sharing with tenants?** -- Not in MVP. Tenants cannot view documents. This could be added in Phase 2 when tenant-facing features are built. The `tenant_id` association on documents is groundwork for this.

7. **Lease end date required for yearly?** -- Recommendation: make it conditionally required in the UI (show validation hint) but optional in the schema. Some landlords may know the type but not the exact date when first entering data. The form can show a warning ("Lease end date recommended for yearly leases") rather than a hard block.
