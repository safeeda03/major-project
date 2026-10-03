const test = require('node:test');
const assert = require('node:assert/strict');
const OcrWorkflowService = require('../services/ocrWorkflowService');

test('creates structured fields only from document text and marks absent fields missing', () => {
  const structured = OcrWorkflowService.buildStructuredData({
    rawText: [
      'Beneficiary Registration',
      'Beneficiary ID: BEN006',
      'Child Name: Rahul Kumar',
      'Date of Birth: 12/03/2023',
      'Gender: Male',
      'Height: 92 cm',
      'Weight: 12.5 kg',
      'Nutritional Status: Underweight',
      'Screening Date: 01/10/2026',
    ].join('\n'),
    beneficiaryId: 'BEN006',
    childName: 'Rahul Kumar',
    dateOfBirth: '12/03/2023',
    height: '92 cm',
    weight: '12.5 kg',
    recordDate: '01/10/2026',
    vaccinationRecords: [],
    confidence: 88,
  });

  assert.equal(structured.classification.label, 'Beneficiary Registration');
  assert.equal(structured.fields.beneficiaryId.value, 'BEN006');
  assert.equal(structured.fields.childName.value, 'Rahul Kumar');
  assert.equal(structured.fields.height.value, '92 cm');
  assert.equal(structured.fields.muac.value, null);
  assert.equal(structured.fields.muac.status, 'not_found');
});

test('does not claim a document type when no classification evidence exists', () => {
  const structured = OcrWorkflowService.buildStructuredData({ rawText: 'Unlabelled handwritten note', vaccinationRecords: [] });
  assert.equal(structured.classification.label, 'Other/Unknown');
  assert.equal(structured.classification.requiresReview, true);
});
