// Submission destination supplied by the project owner.
var TM_SHEET_ID = '1ceNHKXOLR0_gx9rDxRJ9rkpq00thVaX0qfXjO8ocKTU';
function doGet(e) {
  var trainer = e && e.parameter && e.parameter.page === 'trainer';
  return HtmlService.createHtmlOutputFromFile(trainer ? 'Trainer' : 'Student')
    .setTitle(trainer ? 'TM Case Lab | Bài nộp học viên' : 'Tomorrow Marketers | Case Lab')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data && data.action === 'list') return reply_({ok:true, submissions:getTrainerSubmissions()});
    return reply_(receiveSubmission(data));
  }
  catch (error) { return reply_({ok:false, error:'Nội dung bài nộp không hợp lệ.'}); }
}
function receiveSubmission(data) {
  var lock = LockService.getScriptLock();
  try {
    if (!data || !data.submissionId || !/^[a-zA-Z0-9-]{10,100}$/.test(data.submissionId) ||
        typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120 ||
        !Array.isArray(data.answers) || !data.answers.length || data.answers.length > 5) {
      throw new Error('Bài nộp không hợp lệ.');
    }
    var ids = ['reach', 'creative', 'traffic', 'cpc', 'leads'];
    var seen = {};
    data.answers.forEach(function(answer) {
      if (!answer || ids.indexOf(answer.id) < 0 || seen[answer.id] ||
          typeof answer.label !== 'string' || answer.label.length > 200 ||
          typeof answer.answer !== 'string' || !answer.answer.trim() || answer.answer.length > 45000) {
        throw new Error('Câu trả lời không hợp lệ hoặc quá dài (tối đa 45.000 ký tự mỗi case).');
      }
      seen[answer.id] = true;
    });
    lock.waitLock(20000);
    var spreadsheet = SpreadsheetApp.openById(TM_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('Bai nop');
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Bai nop');
      sheet.appendRow(['Mã bài nộp', 'Thời gian nhận', 'Họ tên học viên', 'Case ID', 'Case', 'Câu trả lời']);
      sheet.setFrozenRows(1);
    }
    var existing = sheet.getLastRow() > 1 && sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(data.submissionId).matchEntireCell(true).findNext();
    if (!existing) {
      // Prefix text so student input cannot be interpreted as spreadsheet formulas.
      var text = function(value) { return "'" + value; };
      var now = new Date();
      var rows = data.answers.map(function(answer) {
        return [data.submissionId, now, text(data.name.trim()), answer.id, text(answer.label), text(answer.answer)];
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
      SpreadsheetApp.flush();
    }
    return {ok:true, submissionId:data.submissionId};
  } catch (error) {
    return {ok:false, error:'Chưa ghi được bài nộp. Vui lòng kiểm tra nội dung và thử lại.'};
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
function reply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Both student and trainer pages are accessible without login, as requested.
function onOpen() {
  SpreadsheetApp.getUi().createMenu('TM Case Lab')
    .addItem('Bài nộp học viên', 'openTrainerDashboard').addToUi();
}
function openTrainerDashboard() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Trainer').setWidth(1100).setHeight(700),
    'TM Case Lab — Bài nộp học viên');
}
// Public read-only endpoint for the trainer page.
function getTrainerSubmissions() {
  var sheet = SpreadsheetApp.openById(TM_SHEET_ID).getSheetByName('Bai nop');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getDisplayValues();
  var submissions = Object.create(null);
  rows.forEach(function(row) {
    if (!row[0]) return;
    if (!submissions[row[0]]) submissions[row[0]] = {id:row[0], time:row[1], name:row[2], answers:[]};
    submissions[row[0]].answers.push({id:row[3], label:row[4], answer:row[5]});
  });
  return Object.keys(submissions).reverse().map(function(id) { return submissions[id]; });
}
