# CAMSO — Supabase Document & Data Upload Guide (Round 3)

> **Document Type:** Production / Staging Operational Runbook  
> **Target Audience:** System Administrators, Database Owners, DevOps Engineers  
> **Status:** Ready for Execution by Project Owner  
> **Safety Guarantee:** Additive, deterministic, non-destructive, and dry-run previewable  

---

## 1. Executive Summary & Purpose

During Round 3 testing, the document library was expanded from a limited 3-item stub into a complete, structured 18-document set covering:
1. General technical & warranty documentation.
2. Product-specific datasheets, manuals, and technical bulletins across all core product lines.
3. Role-specific commercial documentation for Authorized Dealers.
4. Supply chain and compound engineering specifications for Regional Distributors.
5. CAD envelope and integration matrices for OEM Integration Partners.
6. Internal platform audit and governance reports restricted exclusively to Administrators.

To strictly enforce data hygiene and prevent confusion:
* **All generated documents are synthetic test fixtures.** They are clearly watermarked as `DEMO / TEST FIXTURE — NOT OFFICIAL SPECIFICATION` and do not assert authoritative CAMSO engineering data.
* **The files are pre-generated, organized deterministically, and ready on disk.** No external PDF compilation or network libraries are required.
* **Per project security boundaries, the AI assistant will NOT upload files or run migrations against remote/production Supabase directly.** This guide provides the exact commands, scripts, and verification procedures for the system owner to safely complete the upload and import.

---

## 2. Directory Structure of Generated PDF Files

All 18 valid standard PDF 1.4 documents are generated in `artifacts/demo-documents/` and mirrored in `uploads/documents/` for local static hosting:

```text
artifacts/demo-documents/
├── document_manifest.json          # Machine-readable schema & metadata manifest
├── general/                        # Public general documentation
│   ├── camso-product-catalog-2024-25.pdf
│   ├── camso-2-year-limited-warranty-policy.pdf
│   └── camso-compact-equipment-tire-care-handbook.pdf
├── products/                       # Product-linked datasheets & manuals
│   ├── camso-track-fitment-guide.pdf               (Linked to SKS-S1-10-16.5)
│   ├── camso-ctl400-maintenance-guide.pdf          (Linked to CTL400-400X86X52)
│   ├── camso-mh701-technical-bulletin.pdf          (Linked to MH701-14.00-24)
│   ├── camso-xtr770-extreme-terrain-datasheet.pdf   (Linked to XTR770-12-16.5)
│   ├── camso-stl300-technical-spec-sheet.pdf       (Linked to STL300-300X52.5X84)
│   ├── camso-bkh100-backhoe-application-guide.pdf  (Linked to BKH100-12.5/80-18)
│   └── camso-exc250-fitting-instructions.pdf       (Linked to EXC250-250X52.5X78)
├── dealer/                         # Dealer commercial & warranty guides
│   ├── dealer-commercial-sales-margin-schedule.pdf
│   ├── dealer-warranty-claim-rma-manual.pdf
│   └── dealer-field-operations-handbook.pdf
├── distributor/                    # Distributor logistics & compound standards
│   ├── regional-distribution-logistics-matrix.pdf
│   └── internal-engineering-compound-standards.pdf
├── oem/                            # OEM technical & CAD envelope guides
│   ├── oem-fitment-engineering-matrix.pdf
│   └── oem-3d-cad-drawing-index.pdf
└── admin/                          # Admin-only governance & audit reports
    └── camso-platform-governance-audit-report.pdf
```

---

## 3. Storage Architecture & Supabase Bucket Configuration

### 3.1 Bucket Creation
1. Log in to the [Supabase Web Console](https://app.supabase.com).
2. Select your project and navigate to **Storage** in the left sidebar.
3. Click **New Bucket** and configure:
   - **Bucket Name:** `documents`
   - **Public Bucket:** **Disabled (Private)** *(Recommended for enterprise RBAC protection)*
   - **Allowed MIME Types:** `application/pdf`
   - **File Size Limit:** `10 MB`

### 3.2 Storage Hierarchy
Upload the contents of `artifacts/demo-documents/` into the `documents` bucket maintaining the relative folder hierarchy:

```text
documents/
├── general/...
├── products/...
├── dealer/...
├── distributor/...
├── oem/...
└── admin/...
```

### 3.3 Upload Methods

#### Option A: Supabase Dashboard (UI Drag & Drop)
Create the 6 folders (`general`, `products`, `dealer`, `distributor`, `oem`, `admin`) within the `documents` bucket, and drag the respective PDF files into each folder.

#### Option B: Supabase CLI
```bash
# Authenticate CLI
supabase login
supabase link --project-ref <your-project-id>

# Copy entire directory to the documents bucket
supabase storage cp -r artifacts/demo-documents/general/ ss:///documents/general/
supabase storage cp -r artifacts/demo-documents/products/ ss:///documents/products/
supabase storage cp -r artifacts/demo-documents/dealer/ ss:///documents/dealer/
supabase storage cp -r artifacts/demo-documents/distributor/ ss:///documents/distributor/
supabase storage cp -r artifacts/demo-documents/oem/ ss:///documents/oem/
supabase storage cp -r artifacts/demo-documents/admin/ ss:///documents/admin/
```

---

## 4. Database Seeding & Metadata Import Procedure

An automated, non-destructive seeder script is provided at `scripts/seed_demo_documents.js`.

### 4.1 Safety & Idempotency Features
- **Deterministic IDs:** Uses fixed identifiers (`d001` through `d015`, `d_prod_004`, `d_prod_005`, `d_prod_007`). Repeated executions will perform non-destructive updates without duplicating rows.
- **Fail-Safe Previews:** Defaults strictly to `--dry-run` mode. Modifying the database requires passing `--execute`.
- **Production Guard:** Refuses execution if `NODE_ENV === 'production'` or if `DATABASE_URL` matches a production pattern without manual review.
- **Product Relational Binding:** Automatically looks up products by `pid` (e.g. `CTL400-400X86X52`) in the target database and links the foreign key `product_id`.

### 4.2 Step 1: Perform a Dry-Run Preview
Review the planned database operations without writing anything:

```bash
node scripts/seed_demo_documents.js --dry-run
```

*Expected Output:*
```text
========================================================================================
CAMSO DEMO DOCUMENT SEEDER — DRY RUN PREVIEW (NO DATABASE CHANGES MADE)
========================================================================================
Manifest loaded: 18 document definitions

ID          ACCESS        TYPE              PRODUCT PID           TITLE
------------------------------------------------------------------------------------------
d001        PUBLIC        MANUAL            SKS-S1-10-16.5        SKS S1 Installation & Safety Manual
d002        PUBLIC        CATALOGUE         (None - General)      CAMSO Product Catalog 2024–25
...
```

### 4.3 Step 2: Execute Idempotent Import into Staging/Local Database
When ready to apply the metadata to your staging database:

```bash
node scripts/seed_demo_documents.js --execute
```

*The seeder will:*
1. Create or update `MediaAsset` records with file sizes and storage paths.
2. Create or update `Document` rows with correct `access_level`, `document_type`, and `is_published: true`.
3. Create or update `DocumentFile` links for language `en`.
4. Create or update `Translation` rows for English document titles.

---

## 5. Role-Based Access Control (RBAC) Specification

The CAMSO backend enforces strict server-side authorization on document listings and downloads. The following table defines accessibility across user roles:

| Document Category | `access_level` | Anonymous / Guest | End User (`END_USER`) | Dealer (`DEALER`) | Distributor (`DISTRIBUTOR`) | OEM Partner (`OEM_PARTNER`) | Admin (`SUPER_ADMIN`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| General & Product Guides | `PUBLIC` | Browse Only | Download | Download | Download | Download | Download |
| Dealer Commercial Guides | `DEALER` | ❌ 401 | ❌ 403 | Download | Download | ❌ 403 | Download |
| Distributor Supply Matrix | `DISTRIBUTOR` | ❌ 401 | ❌ 403 | ❌ 403 | Download | ❌ 403 | Download |
| OEM CAD & Spec Sheets | `OEM` | ❌ 401 | ❌ 403 | ❌ 403 | ❌ 403 | Download | Download |
| Platform Governance | `ADMIN` | ❌ 404 (Hidden) | ❌ 404 (Hidden) | ❌ 404 (Hidden) | ❌ 404 (Hidden) | ❌ 404 (Hidden) | Download |

> [!IMPORTANT]
> **Admin Documents Concealment:** To prevent information disclosure, admin-only documents (`access_level: 'ADMIN'`) return `404 Not Found` (rather than `403 Forbidden`) to non-admin callers, ensuring unauthorized parties cannot confirm their existence.

---

## 6. Verification & Validation Steps

After seeding, verify document retrieval across personas:

### 6.1 Verify Public Catalogue
```bash
curl -X GET "http://localhost:4000/api/v1/documents?page=1&pageSize=20"
```
*Verify that `d015` (Admin governance) is NOT included in the public list.*

### 6.2 Verify Dealer Documents Endpoint
```bash
curl -X GET "http://localhost:4000/api/v1/business/dealer/documents?role_only=true" \
  -H "Authorization: Bearer demo_mode_dealer_token"
```
*Verify that only dealer-specific documents (`access_level: 'DEALER'`) are returned without duplicate entries.*

### 6.3 Verify OEM Documents Endpoint
```bash
curl -X GET "http://localhost:4000/api/v1/business/oem/documents?role_only=true" \
  -H "Authorization: Bearer demo_mode_oem_partner_token"
```
*Verify that only OEM-specific documents (`access_level: 'OEM'`) are returned.*

### 6.4 Verify Document Download Execution
```bash
curl -X GET "http://localhost:4000/api/v1/documents/d001/download" \
  -H "Authorization: Bearer <valid_user_jwt>"
```
*Verify response:*
```json
{
  "status": "success",
  "data": {
    "document_id": "d001",
    "download_url": "http://localhost:4000/uploads/documents/general/camso-track-fitment-guide.pdf",
    "file_name": "camso-track-fitment-guide.pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 4200,
    "download_count": 1
  }
}
```

---

## 7. Backup, Non-Destructive Rollback & Recovery

### 7.1 Database Backup
Prior to executing seeding on staging or production:

```bash
# Export existing documents and media assets
pg_dump -t documents -t document_files -t media_assets -t translations --data-only "$DATABASE_URL" > camso_docs_backup.sql
```

### 7.2 Non-Destructive Rollback
Because all seeded documents use predictable primary keys (`d001`–`d015`, `d_prod_*`), rollback is straightforward and will not impact existing production data:

```sql
-- Rollback seeded test documents and cascade to document_files and translations
DELETE FROM translations 
WHERE entity_type = 'DOCUMENT' 
  AND entity_id IN ('d001', 'd002', 'd003', 'd004', 'd005', 'd006', 'd007', 'd008', 'd009', 'd010', 'd011', 'd012', 'd013', 'd014', 'd015', 'd_prod_004', 'd_prod_005', 'd_prod_007');

DELETE FROM document_files 
WHERE document_id IN ('d001', 'd002', 'd003', 'd004', 'd005', 'd006', 'd007', 'd008', 'd009', 'd010', 'd011', 'd012', 'd013', 'd014', 'd015', 'd_prod_004', 'd_prod_005', 'd_prod_007');

DELETE FROM documents 
WHERE id IN ('d001', 'd002', 'd003', 'd004', 'd005', 'd006', 'd007', 'd008', 'd009', 'd010', 'd011', 'd012', 'd013', 'd014', 'd015', 'd_prod_004', 'd_prod_005', 'd_prod_007');
```
