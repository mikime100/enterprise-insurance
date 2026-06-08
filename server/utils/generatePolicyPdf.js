const PDFDocument = require('pdfkit');

const NAVY   = '#1e3a5f';
const GREEN  = '#16a34a';
const GRAY   = '#6b7280';
const LIGHT  = '#f8fafc';
const BORDER = '#e5e7eb';

function hex(h) {
  const n = parseInt(h.replace('#',''), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}

/**
 * Returns a pdfkit PDFDocument populated with the policy certificate.
 * Caller is responsible for piping / ending the doc.
 */
function generatePolicyPdf(enrollment) {
  const doc  = new PDFDocument({ size: 'A4', margins: { top: 0, left: 0, right: 0, bottom: 0 }, info: {
    Title:   `Policy Certificate — ${enrollment.enrollmentNumber}`,
    Author:  'Enterprise Insurance S.C.',
    Subject: 'Policy Certificate',
  }});

  const W      = 595;   // A4 width pt
  const MARGIN = 48;
  const CW     = W - MARGIN * 2;   // content width

  const person = enrollment.insuredPersons?.[0];
  const tier   = enrollment.tier;
  const product = enrollment.product;
  const payer  = enrollment.payer;

  /* ── helpers ── */
  const fillHex = (h) => { const [r,g,b] = hex(h); doc.fillColor([r,g,b]); };
  const strokeHex = (h) => { const [r,g,b] = hex(h); doc.strokeColor([r,g,b]); };

  /* ────────────────────────────────────────────────
     HEADER BAND
  ──────────────────────────────────────────────── */
  const [nr,ng,nb] = hex(NAVY);
  doc.rect(0, 0, W, 90).fill([nr,ng,nb]);

  // Shield icon circle
  const [gr,gg,gb] = hex(GREEN);
  doc.circle(MARGIN + 22, 45, 22).fill([gr,gg,gb]);
  doc.fillColor('white').fontSize(22).text('✦', MARGIN + 11, 34);

  // Company name
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text('Enterprise Insurance S.C.', MARGIN + 56, 26, { width: CW - 56 });
  doc.fillColor([180,200,230]).fontSize(11).font('Helvetica')
    .text('POLICY CERTIFICATE', MARGIN + 56, 52, { width: CW - 56 });

  // Enrollment # top-right
  doc.fillColor([180,200,230]).fontSize(9).font('Helvetica')
    .text(enrollment.enrollmentNumber, W - MARGIN - 130, 30, { width: 130, align: 'right' });
  doc.fillColor('white').fontSize(9)
    .text(`Issued: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}`, W - MARGIN - 130, 44, { width: 130, align: 'right' });

  let y = 108;

  /* ── section heading helper ── */
  const sectionHead = (title, yPos) => {
    const [r,g,b] = hex(LIGHT);
    doc.rect(MARGIN, yPos, CW, 24).fill([r,g,b]);
    strokeHex(BORDER);
    doc.rect(MARGIN, yPos, CW, 24).stroke();
    const [nr2,ng2,nb2] = hex(NAVY);
    doc.fillColor([nr2,ng2,nb2]).fontSize(9).font('Helvetica-Bold')
      .text(title.toUpperCase(), MARGIN + 10, yPos + 7, { width: CW - 20 });
    return yPos + 24;
  };

  /* ── field row helper ── */
  const field = (label, value, xOff, yPos, colW) => {
    doc.fillColor([100,116,139]).fontSize(8).font('Helvetica')
      .text(label, xOff, yPos, { width: colW });
    doc.fillColor([17,24,39]).fontSize(10).font('Helvetica-Bold')
      .text(value || '—', xOff, yPos + 11, { width: colW });
    return yPos + 28;
  };

  /* ── divider helper ── */
  const divider = (yPos) => {
    strokeHex(BORDER);
    doc.moveTo(MARGIN, yPos).lineTo(MARGIN + CW, yPos).stroke();
    return yPos + 1;
  };

  /* ────────────────────────────────────────────────
     POLICYHOLDER & POLICY DETAILS  (two columns)
  ──────────────────────────────────────────────── */
  y = sectionHead('Policyholder Details', y) + 10;

  const col = CW / 2 - 10;
  field('Full Name',  person ? `${person.firstName} ${person.lastName}` : '—', MARGIN, y, col);
  field('Product',    product?.name || '—', MARGIN + col + 20, y, col);
  y += 28;
  field('Email',      person?.email || '—', MARGIN, y, col);
  field('Tier / Plan', tier?.name || '—',  MARGIN + col + 20, y, col);
  y += 28;
  field('National ID', person?.nationalId || '—', MARGIN, y, col);
  field('Insurer',    payer?.name || 'Enterprise Insurance S.C.', MARGIN + col + 20, y, col);
  y += 32;

  y = divider(y) + 12;

  /* ────────────────────────────────────────────────
     POLICY PERIOD & PREMIUM
  ──────────────────────────────────────────────── */
  y = sectionHead('Policy Period & Premium', y) + 10;

  field('Start Date',    new Date(enrollment.startDate).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}), MARGIN, y, col);
  field('Annual Premium', `ETB ${(enrollment.premium?.amount || 0).toLocaleString()}`, MARGIN + col + 20, y, col);
  y += 28;
  field('End Date',      new Date(enrollment.endDate).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}), MARGIN, y, col);
  field('Payment Freq.', enrollment.premium?.frequency || 'Annual', MARGIN + col + 20, y, col);
  y += 28;
  if (enrollment.renewalDate) {
    field('Renewal Date', new Date(enrollment.renewalDate).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}), MARGIN, y, col);
    y += 28;
  }

  y = divider(y + 4) + 12;

  /* ────────────────────────────────────────────────
     COVERAGE SUMMARY TABLE
  ──────────────────────────────────────────────── */
  const coverages = tier?.coverages || [];
  if (coverages.length > 0) {
    y = sectionHead('Coverage Summary', y) + 6;

    // Table header
    const [r,g,b] = hex(NAVY);
    doc.rect(MARGIN, y, CW, 20).fill([r,g,b]);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    doc.text('BENEFIT / SERVICE',            MARGIN + 8,    y + 6, { width: 180 });
    doc.text('ANNUAL LIMIT (ETB)',            MARGIN + 200,  y + 6, { width: 120, align: 'right' });
    doc.text('DEDUCTIBLE (ETB)',              MARGIN + 330,  y + 6, { width: 110, align: 'right' });
    doc.text('CO-PAY',                        MARGIN + 450,  y + 6, { width: 48,  align: 'right' });
    y += 20;

    coverages.forEach((tc, idx) => {
      const cov    = tc.coverage;
      const limit  = tc.customLimit || cov?.limits?.annual || 0;
      const rowBg  = idx % 2 === 0 ? [255,255,255] : [248,250,252];
      doc.rect(MARGIN, y, CW, 22).fill(rowBg);
      strokeHex(BORDER);
      doc.rect(MARGIN, y, CW, 22).stroke();

      doc.fillColor([17,24,39]).fontSize(9).font('Helvetica-Bold')
        .text(cov?.name || '—', MARGIN + 8, y + 5, { width: 180 });
      if (cov?.description) {
        doc.fillColor([107,114,128]).fontSize(7).font('Helvetica')
          .text(cov.description, MARGIN + 8, y + 14, { width: 180 });
      }
      doc.fillColor([22,163,74]).fontSize(10).font('Helvetica-Bold')
        .text(limit > 0 ? limit.toLocaleString() : '—', MARGIN + 200, y + 7, { width: 120, align: 'right' });
      doc.fillColor([17,24,39]).fontSize(9).font('Helvetica')
        .text((cov?.deductible || 0).toLocaleString(), MARGIN + 330, y + 7, { width: 110, align: 'right' });
      doc.text(cov?.copaymentPct ? `${cov.copaymentPct}%` : '0%', MARGIN + 450, y + 7, { width: 48, align: 'right' });
      y += 22;
    });

    y += 12;
  }

  /* ────────────────────────────────────────────────
     KEY TERMS & CONDITIONS
  ──────────────────────────────────────────────── */
  // Check if we need a new page
  if (y > 650) { doc.addPage(); y = 40; }

  y = sectionHead('Key Terms & Conditions', y) + 10;

  const terms = [
    ['Claims Deadline',  '90 days from date of incident with full supporting documentation.'],
    ['Waiting Period',   'Certain non-emergency benefits may have a 30–90 day waiting period after activation.'],
    ['Plan Changes',     'Permitted within 30 days of policy start. Later changes require underwriting review.'],
    ['Cancellation',     '30-day written notice required. Pro-rated refund minus 10% admin fee. No refund after 11 months.'],
    ['Disputes',         'Unresolved disputes referred to NIBE (National Insurance Board of Ethiopia) within 30 days.'],
    ['Exclusions',       'Pre-existing conditions (waiting period), cosmetic/elective procedures, self-inflicted injuries, illegal activities, war/civil unrest, and fraud are excluded.'],
  ];

  terms.forEach(([label, text]) => {
    doc.fillColor([17,24,39]).fontSize(8).font('Helvetica-Bold')
      .text(`${label}:`, MARGIN, y, { width: 110, continued: false });
    doc.fillColor([55,65,81]).fontSize(8).font('Helvetica')
      .text(text, MARGIN + 115, y, { width: CW - 115 });
    y += doc.heightOfString(text, { width: CW - 115 }) + 8;
  });

  y += 8;

  /* ────────────────────────────────────────────────
     SIGNATURE BLOCK
  ──────────────────────────────────────────────── */
  if (y > 710) { doc.addPage(); y = 40; }

  y = divider(y) + 20;

  // Left sig block
  strokeHex('#9ca3af');
  doc.moveTo(MARGIN, y + 30).lineTo(MARGIN + 160, y + 30).stroke();
  doc.fillColor([107,114,128]).fontSize(8).font('Helvetica')
    .text('Authorised Signatory', MARGIN, y + 34, { width: 160 });
  doc.fillColor([17,24,39]).fontSize(9).font('Helvetica-Bold')
    .text('Enterprise Insurance S.C.', MARGIN, y + 46, { width: 160 });

  // Right date block
  strokeHex('#9ca3af');
  doc.moveTo(W - MARGIN - 120, y + 30).lineTo(W - MARGIN, y + 30).stroke();
  doc.fillColor([107,114,128]).fontSize(8).font('Helvetica')
    .text('Date of Issue', W - MARGIN - 120, y + 34, { width: 120 });
  doc.fillColor([17,24,39]).fontSize(9).font('Helvetica-Bold')
    .text(new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }), W - MARGIN - 120, y + 46, { width: 120 });

  /* ── Footer ── */
  const pageH = doc.page.height;
  const [fr,fg,fb] = hex(NAVY);
  doc.rect(0, pageH - 36, W, 36).fill([fr,fg,fb]);
  doc.fillColor([148,163,184]).fontSize(8).font('Helvetica')
    .text('This is an official policy certificate issued by Enterprise Insurance S.C. | Regulated by NIBE', MARGIN, pageH - 22, { width: CW, align: 'center' });

  return doc;
}

module.exports = generatePolicyPdf;
