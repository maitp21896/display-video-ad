# Google Sheets receiver for the standalone website

Students and trainers use the website on Vercel. Apps Script only exchanges data with the website's server. They do not open Google links or log in.

Sheet: https://docs.google.com/spreadsheets/d/1ceNHKXOLR0_gx9rDxRJ9rkpq00thVaX0qfXjO8ocKTU/edit

## Update the existing receiver

The current deployment already has `receiveSubmission` and `getTrainerSubmissions`. Replace only its `doPost` function with:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data && data.action === 'list') {
      return reply_({ok: true, submissions: getTrainerSubmissions()});
    }
    return reply_(receiveSubmission(data));
  } catch (error) {
    return reply_({ok: false, error: 'Nội dung bài nộp không hợp lệ.'});
  }
}
```

Save, then **Deploy → Manage deployments → Edit → Version: New version → Deploy**. Keep **Execute as: Me** and **Who has access: Anyone**. Updating the existing deployment preserves the URL. If a new deployment is created, update the website's `GOOGLE_SCRIPT_URL` environment variable in Vercel.

The full `Code.gs` in this folder contains the same change. There is no need to update or create Student/Trainer files in Google for the standalone website. Existing files can remain.

## API contract

- POST a submission with `submissionId`, `name`, `answers` to write only answered cases. Success returns `ok: true` and the same submission ID after `SpreadsheetApp.flush()`.
- POST `{ "action": "list" }` to read submissions for the public trainer page, grouped by submission ID and newest first.
- Reusing an existing submission ID does not add rows.
- Dates and answers remain in the `Bai nop` sheet. Student text is escaped before spreadsheet writes and rendered with `textContent` in the website.
