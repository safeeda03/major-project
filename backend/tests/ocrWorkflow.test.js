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

test('extracts values from adjacent label and value table rows', () => {
  const OCRService = require('../services/ocrService');
  const data = OCRService.extractDataFromText([
    'Name Rahul Kumar',
    'Beneficiary ID BEN006',
    'Age 3 years 8 months',
    'Gender Male',
    'Status Underweight',
  ].join('\n'));
  assert.equal(data.beneficiaryId, 'BEN006');
  assert.equal(data.age, '3 years 8 months');
  assert.equal(data.gender, 'Male');
  assert.equal(data.nutritionalStatus, 'Underweight');
});

test('extracts gender when table OCR puts the value on the next line', () => {
  const OCRService = require('../services/ocrService');
  const data = OCRService.extractDataFromText('Gender\nMaie\nStatus\nUnderweight');
  assert.equal(data.gender, 'Male');
  assert.equal(data.nutritionalStatus, 'Underweight');
});

test('reconstructs collapsed selectable-PDF table rows without inventing values', () => {
  const OCRService = require('../services/ocrService');
  const data = OCRService.extractDataFromText([
    'Beneficiary IDBEN006', 'Child NameRahul Kumar', 'Date of Birth14 February 2023', 'Age3 years 7 months', 'GenderMale',
    'Mother / Guardian NameAnitha Kumar', 'Parent / Guardian IDGDN-45821', 'Contact Number+91 98765 43210',
    'AddressWard 12, Ernakulam, Kerala', 'Anganwadi Centre IDAWC-KL-EKM-014',
    'Height94.5 cm03 October 2026', 'Weight12.4 kg03 October 2026', 'MUAC14.2 cm03 October 2026',
    'Nutritional StatusNormal03 October 2026', 'Health ObservationActive; no immediate concerns reported03 October 2026',
    'BCG115 February 2023Completed', 'OPV115 February 2023Completed',
  ].join('\n'));
  assert.deepEqual({
    id: data.beneficiaryId, name: data.childName, parent: data.parentName, height: data.height, weight: data.weight,
    muac: data.muac, status: data.nutritionalStatus, date: data.recordDate,
  }, { id: 'BEN006', name: 'Rahul Kumar', parent: 'Anitha Kumar', height: '94.5 cm', weight: '12.4 kg', muac: '14.2 cm', status: 'Normal', date: '03 October 2026' });
  assert.equal(data.vaccinationRecords.length, 2);
  assert.deepEqual(data.vaccinationRecords[0], { vaccine: 'BCG', dose: '1', date: '15 February 2023', nextDue: '', status: 'Completed' });
});

test('accepts strict written dates from the OCR PDF when validating a reviewed beneficiary', () => {
  const review = {
    fields: {
      childName: { value: 'Rahul Kumar' },
      dateOfBirth: { value: '14 February 2023' },
      gender: { value: 'Male' },
      screeningDate: { value: '03 October 2026' },
    },
  };
  assert.deepEqual(OcrWorkflowService.validateReview(review, true), []);
});
