'use strict';

/**
 * 1. What this file does:
 *    Generates deterministic, valid PDF 1.4 documents for CAMSO testing, organizing them
 *    into artifacts/demo-documents/ and uploads/documents/ with full metadata cataloging.
 * 2. Overall design:
 *    Constructs standard PDF 1.4 binary/text streams with xref tables and trailers without third-party dependencies.
 *    Generates distinct synthetic documents for all 7 catalog products plus general, dealer, distributor, OEM, and admin roles.
 *    Outputs an authoritative document_manifest.json used for reproducible database seeding.
 * 3. Elements in the file:
 *    - buildPdfContent: Generates compliant PDF-1.4 binary buffer with title, metadata, and demo disclaimer.
 *    - DOCUMENT_DEFINITIONS: Authoritative list of 17 documents covering all products and roles.
 *    - generateAllDemoDocuments: Orchestrates directory creation, file writing, validation, and manifest output.
 * 4. Final output of the file:
 *    Executable Node script producing valid PDF files in artifacts/demo-documents/ and uploads/documents/.
 */

const fs = require('fs');
const path = require('path');

/**
 * Builds a compliant PDF 1.4 document buffer.
 *
 * 1. The use of function:
 *    Creates a valid PDF file with text content, cross-reference table, and trailer.
 * 2. How does the specific function work:
 *    Formats PDF stream objects with Helvetica font, draws header banner and text lines,
 *    calculates object byte offsets, and outputs exact xref table and trailer.
 * 3. Concepts used in the function:
 *    PDF 1.4 specification, binary stream encoding, xref offset indexing.
 * 4. Places where this function is imported and used:
 *    Used in generateAllDemoDocuments loop.
 * 5. Final output of the function, before and after:
 *    Before: Document title and metadata strings.
 *    After: Buffer containing a valid, readable PDF document.
 *
 * @param {object} doc - Document definition object.
 * @returns {Buffer}
 */
function buildPdfContent(doc) {
  const lines = [
    `CAMSO TECHNICAL & COMMERCIAL DOCUMENTATION`,
    `------------------------------------------------------------`,
    `Title:        ${doc.title}`,
    `Document ID:  ${doc.id}`,
    `Access Level: ${doc.access_level}`,
    `Doc Type:     ${doc.document_type}`,
    `Target Role:  ${doc.audience}`,
    `Product Ref:  ${doc.product_pid || 'General Fleet / Global'}`,
    `Date Issued:  ${doc.date || '2026-10-18'}`,
    `Version:      ${doc.version || '1.0'}`,
    ``,
    `NOTICE:`,
    `This is a synthetic DEMO test fixture generated for local and`,
    `staging validation of the CAMSO mobile application and business portal.`,
    `Not an official CAMSO engineering document. Specifications are demo values.`,
    ``,
    `Summary:`,
    `${doc.description || 'Comprehensive technical documentation and operational guidelines.'}`,
    ``,
    `Authorized Access Policy:`,
    `Classification: ${doc.access_level}. Unauthorized redistribution prohibited.`,
  ];

  // Build stream content
  let streamText = 'BT\n/F1 16 Tf\n50 720 Td\n';
  streamText += `(${doc.title.replace(/[()\\]/g, '')}) Tj\n`;
  streamText += 'ET\n';

  streamText += 'BT\n/F2 10 Tf\n50 680 Td\n14 TL\n';
  for (const line of lines) {
    const escaped = line.replace(/[()\\]/g, '');
    streamText += `(${escaped}) '\n`;
  }
  streamText += 'ET\n';

  const streamLength = Buffer.byteLength(streamText, 'utf8');

  // Construct PDF objects
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj6 = '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  // Calculate offsets
  const offset1 = Buffer.byteLength(header, 'utf8');
  const offset2 = offset1 + Buffer.byteLength(obj1, 'utf8');
  const offset3 = offset2 + Buffer.byteLength(obj2, 'utf8');
  const offset4 = offset3 + Buffer.byteLength(obj3, 'utf8');
  const offset5 = offset4 + Buffer.byteLength(obj4, 'utf8');
  const offset6 = offset5 + Buffer.byteLength(obj5, 'utf8');
  const startXref = offset6 + Buffer.byteLength(obj6, 'utf8');

  const pad = (n) => String(n).padStart(10, '0');

  const xref = [
    'xref',
    '0 7',
    '0000000000 65535 f ',
    `${pad(offset1)} 00000 n `,
    `${pad(offset2)} 00000 n `,
    `${pad(offset3)} 00000 n `,
    `${pad(offset4)} 00000 n `,
    `${pad(offset5)} 00000 n `,
    `${pad(offset6)} 00000 n `,
  ].join('\n') + '\n';

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref + trailer, 'utf8');
}

const DOCUMENT_DEFINITIONS = [
  // 1. General Public Documents (Matching Flutter d001-d007)
  {
    id: 'd001',
    slug: 'camso-sks-s1-installation-manual',
    title: 'SKS S1 Installation & Safety Manual',
    folder: 'general',
    filename: 'camso_sks_s1_installation_manual.pdf',
    product_pid: 'SKS-S1-10-16.5',
    category: 'skid-steer',
    document_type: 'MANUAL',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '2.3',
    description: 'Complete installation guide for SKS S1 series skid steer tires. Includes torque specifications, bead seating, and safety procedures.',
  },
  {
    id: 'd002',
    slug: 'camso-product-catalog-2024-25',
    title: 'CAMSO Product Catalog 2024–25',
    folder: 'general',
    filename: 'camso_product_catalog_2024_25.pdf',
    product_pid: null,
    category: 'brochures',
    document_type: 'CATALOGUE',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '1.0',
    description: 'Full product range catalog featuring all Compact Construction Tires and Tracks for the 2024–25 season.',
  },
  {
    id: 'd003',
    slug: 'camso-ctl-400-maintenance-guide',
    title: 'CTL 400 Series Maintenance Guide',
    folder: 'general',
    filename: 'camso_ctl_400_maintenance_guide.pdf',
    product_pid: 'CTL400-400X86X52',
    category: 'rubber-tracks',
    document_type: 'MANUAL',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '3.1',
    description: 'Comprehensive maintenance schedule and track tensioning procedures for CTL 400 series rubber tracks.',
  },
  {
    id: 'd004',
    slug: 'camso-mh-701-technical-bulletin',
    title: 'MH 701 Technical Bulletin TB-2024-08',
    folder: 'general',
    filename: 'camso_mh_701_technical_bulletin.pdf',
    product_pid: 'MH701-14.00-24',
    category: 'telehandler',
    document_type: 'BULLETIN',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '1.0',
    description: 'Critical update regarding inflation pressure recommendations for MH 701 series telehandler tires in high-temperature environments.',
  },
  {
    id: 'd005',
    slug: 'camso-2-year-warranty-policy',
    title: 'CAMSO 2-Year Limited Warranty Policy',
    folder: 'general',
    filename: 'camso_2_year_warranty_policy.pdf',
    product_pid: null,
    category: 'warranty',
    document_type: 'WARRANTY',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '5.2',
    description: 'Complete warranty terms, conditions, coverage limits, and claim submission procedures for CAMSO tires and tracks.',
  },
  {
    id: 'd006',
    slug: 'camso-care-handbook',
    title: 'CAMSO Compact Equipment Tire & Track Care Handbook',
    folder: 'general',
    filename: 'camso_care_handbook.pdf',
    product_pid: null,
    category: 'maintenance',
    document_type: 'TECHNICAL_GUIDE',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '2.0',
    description: 'Best practice guide for routine inspection, wear patterns, alignment, and track tensioning on compact construction machinery.',
  },
  {
    id: 'd007',
    slug: 'camso-xtr-770-data-sheet',
    title: 'XTR 770 Extreme Terrain Data Sheet',
    folder: 'general',
    filename: 'camso_xtr_770_data_sheet.pdf',
    product_pid: 'XTR770-12-16.5',
    category: 'skid-steer',
    document_type: 'BROCHURE',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '1.0',
    description: 'Technical data sheet and product highlights for the new XTR 770 extreme terrain tire range engineered for demolition and quarrying.',
  },

  // 2. Additional Product-Specific Documents (Full 7-Product Coverage)
  {
    id: 'd_prod_004',
    slug: 'camso-stl-300-spec-sheet',
    title: 'STL 300 Steel Track Technical Specification Sheet',
    folder: 'products',
    filename: 'camso_stl_300_spec_sheet.pdf',
    product_pid: 'STL300-300X52.5X84',
    category: 'steel-tracks',
    document_type: 'TECHNICAL_GUIDE',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '1.1',
    description: 'Engineering specifications, link pitch tolerances, and pin assembly parameters for STL 300 heavy-duty steel tracks.',
  },
  {
    id: 'd_prod_005',
    slug: 'camso-bkh-100-application-guide',
    title: 'BKH 100 Backhoe Loader Tire Application Guide',
    folder: 'products',
    filename: 'camso_bkh_100_application_guide.pdf',
    product_pid: 'BKH100-12.5/80-18',
    category: 'backhoe',
    document_type: 'MANUAL',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '1.2',
    description: 'Load vs inflation pressure tables and duty-cycle recommendations for BKH 100 multi-purpose backhoe tires.',
  },
  {
    id: 'd_prod_007',
    slug: 'camso-exc-250-fitting-instructions',
    title: 'EXC 250 Mini-Excavator Track Fitting & Safety Instructions',
    folder: 'products',
    filename: 'camso_exc_250_fitting_instructions.pdf',
    product_pid: 'EXC250-250X52.5X78',
    category: 'excavator',
    document_type: 'MANUAL',
    access_level: 'PUBLIC',
    audience: 'GENERAL_PUBLIC',
    version: '1.0',
    description: 'Step-by-step mounting guide, idler alignment verification, and sprocket engagement specs for EXC 250 excavator tracks.',
  },

  // 3. Dealer Restricted Documents
  {
    id: 'd008',
    slug: 'dealer-commercial-margin-schedule',
    title: 'Dealer Commercial Sales & Margin Schedule',
    folder: 'dealer',
    filename: 'dealer_commercial_margin_schedule.pdf',
    product_pid: null,
    category: 'commercial',
    document_type: 'BROCHURE',
    access_level: 'DEALER',
    audience: 'AUTHORIZED_DEALERS',
    version: '1.2',
    description: 'Confidential authorized dealer pricing tiers, rebate structures, and wholesale margin schedules for CAMSO products.',
  },
  {
    id: 'd009',
    slug: 'dealer-warranty-rma-manual',
    title: 'Dealer Warranty Claim & RMA Processing Manual',
    folder: 'dealer',
    filename: 'dealer_warranty_rma_manual.pdf',
    product_pid: null,
    category: 'warranty',
    document_type: 'WARRANTY',
    access_level: 'DEALER',
    audience: 'AUTHORIZED_DEALERS',
    version: '2.0',
    description: 'Step-by-step procedures for authorized dealers to submit fast-track warranty claims, photographic inspections, and return authorizations.',
  },

  // 4. Distributor Restricted Documents
  {
    id: 'd010',
    slug: 'distributor-logistics-allocation-matrix',
    title: 'Regional Distribution Logistics & Supply Allocation Matrix',
    folder: 'distributor',
    filename: 'distributor_logistics_allocation_matrix.pdf',
    product_pid: null,
    category: 'distribution',
    document_type: 'BULLETIN',
    access_level: 'DISTRIBUTOR',
    audience: 'REGIONAL_DISTRIBUTORS',
    version: '3.0',
    description: 'Regional warehouse stocking plans, container order logistics, and seasonal buffer allocation matrix for regional distributors.',
  },

  // 5. Internal / Operations Documents
  {
    id: 'd011',
    slug: 'camso-operations-handbook',
    title: 'CAMSO Field Operations Guide & Handbook',
    folder: 'dealer',
    filename: 'camso_operations_handbook.pdf',
    product_pid: null,
    category: 'maintenance',
    document_type: 'MANUAL',
    access_level: 'DEALER',
    audience: 'DEALER_AND_OPERATIONS',
    version: '4.1',
    description: 'Field operations guidelines, safety procedures, application engineering protocols, and certified partner directory.',
  },
  {
    id: 'd012',
    slug: 'internal-engineering-compound-standards',
    title: 'Internal Engineering Specifications & Compound Standards',
    folder: 'distributor',
    filename: 'internal_engineering_compound_standards.pdf',
    product_pid: null,
    category: 'technical',
    document_type: 'TECHNICAL_GUIDE',
    access_level: 'DISTRIBUTOR',
    audience: 'DISTRIBUTOR_TECHNICAL_LEADS',
    version: '2024-R3',
    description: 'Technical data sheet on rubber compound hardness, tensile ratings, steel cord metallurgy, and internal testing metrics.',
  },

  // 6. OEM Partner Restricted Documents
  {
    id: 'd013',
    slug: 'oem-fitment-integration-matrix',
    title: 'OEM Fitment & Engineering Integration Matrix',
    folder: 'oem',
    filename: 'oem_fitment_integration_matrix.pdf',
    product_pid: null,
    category: 'technical',
    document_type: 'TECHNICAL_GUIDE',
    access_level: 'OEM',
    audience: 'OEM_ENGINEERING_PARTNERS',
    version: '2025.1',
    description: 'Technical engineering drawings, hub flange clearances, rolling circumference tolerances, and chassis integration specifications for OEM machinery.',
  },
  {
    id: 'd014',
    slug: 'camso-3d-cad-drawing-index',
    title: 'CAMSO 3D CAD & Technical Drawing Index',
    folder: 'oem',
    filename: 'camso_3d_cad_drawing_index.pdf',
    product_pid: null,
    category: 'manuals',
    document_type: 'MANUAL',
    access_level: 'OEM',
    audience: 'OEM_ENGINEERING_PARTNERS',
    version: '1.4',
    description: 'STEP/IGES file index and 3D boundary dimensions for original equipment manufacturers integrating CAMSO tracks and wheels.',
  },

  // 7. Admin Only Documents
  {
    id: 'd015',
    slug: 'admin-platform-governance-report',
    title: 'CAMSO Platform Governance & Content Audit Report',
    folder: 'admin',
    filename: 'admin_platform_governance_report.pdf',
    product_pid: null,
    category: 'brochures',
    document_type: 'MANUAL',
    access_level: 'ADMIN',
    audience: 'PLATFORM_ADMINISTRATORS',
    version: '1.0',
    description: 'Quarterly content governance review, CMS audit log summary, and digital catalogue synchronization status.',
  },
];

/**
 * Orchestrates local PDF generation and manifest indexing.
 */
function generateAllDemoDocuments() {
  const repoRoot = path.resolve(__dirname, '..');
  const artifactsBase = path.join(repoRoot, 'artifacts', 'demo-documents');
  const uploadsBase = path.join(repoRoot, 'uploads', 'documents');

  if (!fs.existsSync(artifactsBase)) {
    fs.mkdirSync(artifactsBase, { recursive: true });
  }
  if (!fs.existsSync(uploadsBase)) {
    fs.mkdirSync(uploadsBase, { recursive: true });
  }

  const manifest = [];

  for (const doc of DOCUMENT_DEFINITIONS) {
    const subDir = path.join(artifactsBase, doc.folder);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    const artifactPath = path.join(subDir, doc.filename);
    const uploadPath = path.join(uploadsBase, doc.filename);

    const pdfBuffer = buildPdfContent(doc);

    // Write to artifacts/demo-documents/<folder>/
    fs.writeFileSync(artifactPath, pdfBuffer);

    // Mirror to uploads/documents/ for local Express static downloads
    fs.writeFileSync(uploadPath, pdfBuffer);

    // Verify PDF header and trailer
    const fileBytes = fs.readFileSync(artifactPath);
    const fileStr = fileBytes.toString('utf8');
    const isValid = fileStr.startsWith('%PDF-1.4') && fileStr.includes('%%EOF');

    if (!isValid) {
      throw new Error(`Generated PDF failed validation: ${doc.filename}`);
    }

    manifest.push({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      folder: doc.folder,
      filename: doc.filename,
      relative_artifact_path: `artifacts/demo-documents/${doc.folder}/${doc.filename}`,
      local_upload_path: `/uploads/documents/${doc.filename}`,
      storage_key: `documents/${doc.folder}/${doc.filename}`,
      product_pid: doc.product_pid,
      category: doc.category,
      document_type: doc.document_type,
      access_level: doc.access_level,
      audience: doc.audience,
      version: doc.version,
      description: doc.description,
      size_bytes: pdfBuffer.length,
      mime_type: 'application/pdf',
      is_published: true,
      verified_pdf: true,
    });
  }

  const manifestPath = path.join(artifactsBase, 'document_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`[PDF GENERATOR] Successfully generated ${manifest.length} valid PDF documents.`);
  console.log(`[PDF GENERATOR] Artifacts directory: ${artifactsBase}`);
  console.log(`[PDF GENERATOR] Uploads directory:   ${uploadsBase}`);
  console.log(`[PDF GENERATOR] Manifest written to: ${manifestPath}`);

  return manifest;
}

if (require.main === module) {
  try {
    generateAllDemoDocuments();
  } catch (err) {
    console.error(`[PDF GENERATOR ERROR] ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildPdfContent,
  generateAllDemoDocuments,
  DOCUMENT_DEFINITIONS,
};
