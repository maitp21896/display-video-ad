const { AppError, validateSubmission, callSheets } = require('../lib/sheets');
const MAX_BODY_BYTES = 1024 * 1024;
async function readBody(req) {
  let body = req.body;
  if (body === undefined) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) throw new AppError('Bài nộp quá lớn.', 413);
      chunks.push(Buffer.from(chunk));
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new AppError('Bài nộp quá lớn.', 413);
    try { body = JSON.parse(body); } catch { throw new AppError('Bài nộp không đúng định dạng.', 400); }
  }
  return body;
}
function createHandler(upstream = callSheets) {
  return async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method === 'GET') {
        const result = await upstream({ action: 'list' });
        if (!Array.isArray(result.submissions)) throw new AppError('Danh sách bài nộp không hợp lệ.');
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, submissions: result.submissions }));
        return;
      }
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        throw new AppError('Phương thức không được hỗ trợ.', 405);
      }
      // Reject cross-site browser submissions; non-browser clients remain usable.
      const origin = req.headers.origin;
      if (origin) {
        let host;
        try { host = new URL(origin).host; } catch { throw new AppError('Nguồn gửi bài không hợp lệ.', 403); }
        if (host !== req.headers.host) throw new AppError('Vui lòng nộp bài từ trang học viên.', 403);
      }
      const submission = validateSubmission(await readBody(req));
      const result = await upstream(submission);
      if (result.submissionId !== submission.submissionId) throw new AppError('Mã xác nhận bài nộp không khớp.');
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, submissionId: submission.submissionId }));
    } catch (error) {
      res.statusCode = error instanceof AppError ? error.status : 500;
      res.end(JSON.stringify({ ok: false, error: error instanceof AppError ? error.message : 'Máy chủ đang gặp sự cố. Vui lòng thử lại.' }));
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
