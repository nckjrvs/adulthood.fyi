// Google Apps Script — paste this into your Sheet's script editor
// (Extensions > Apps Script > replace contents of Code.gs)

var SHEET_NAME = 'Reviews';

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var headers = data[0];
  var reviews = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    reviews.push({
      created_at: row[0],
      overall: Number(row[1]),
      categories: {
        money: Number(row[2]),
        job: Number(row[3]),
        paying: Number(row[4]),
        freedom: Number(row[5]),
        relationships: Number(row[6]),
        time_energy: Number(row[7]),
        purpose: Number(row[8])
      },
      reflection: {
        harder: row[9] || '',
        better: row[10] || '',
        learned: row[11] || ''
      },
      age: Number(row[12]),
      state: row[13] || '',
      tags: row[14] ? row[14].split(',').map(function(t) { return t.trim(); }).filter(Boolean) : []
    });
  }

  return ContentService.createTextOutput(JSON.stringify(reviews)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  // Create sheet + headers if it doesn't exist
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
    sheet.appendRow([
      'created_at', 'overall',
      'money', 'job', 'paying', 'freedom', 'relationships', 'time_energy', 'purpose',
      'harder', 'better', 'learned',
      'age', 'state', 'tags'
    ]);
  }

  var review = JSON.parse(e.postData.contents);

  sheet.appendRow([
    review.created_at || new Date().toISOString(),
    review.overall || 0,
    (review.categories && review.categories.money) || 0,
    (review.categories && review.categories.job) || 0,
    (review.categories && review.categories.paying) || 0,
    (review.categories && review.categories.freedom) || 0,
    (review.categories && review.categories.relationships) || 0,
    (review.categories && review.categories.time_energy) || 0,
    (review.categories && review.categories.purpose) || 0,
    (review.reflection && review.reflection.harder) || '',
    (review.reflection && review.reflection.better) || '',
    (review.reflection && review.reflection.learned) || '',
    review.age || '',
    review.state || '',
    (review.tags || []).join(', ')
  ]);

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
}

// Run this once manually to create the sheet with headers
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'created_at', 'overall',
      'money', 'job', 'paying', 'freedom', 'relationships', 'time_energy', 'purpose',
      'harder', 'better', 'learned',
      'age', 'state', 'tags'
    ]);
  }
}
