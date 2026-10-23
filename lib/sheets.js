const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbyyIT0JC5_Ia5atKuAWCmrR0EM9Zi0FttK-AiEXfUFXjvp7LNGdLYTFC0r9Cjo2_lzHKw/exec';
class AppError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
const labels = {
  reach: '01 · Lựa chọn phương án',
  creative: '02 · Thông điệp / kích thước',
  traffic: '03 · Traffic & đơn hàng',
  cpc: '04 · Giá thầu & tỷ lệ click',
  leads: '05 · Lead generation'
};
function validateSubmission(data) {
  if (!data || typeof data.submissionId !== 'string' || !/^[a-zA-Z0-9-]{10,100}$/.test(data.submissionId) ||
      typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120 ||
      !Array.isArray(data.answers) || !data.answers.length || data.answers.length > 5) {
    throw new AppError('Vui lòng nhập tên và câu trả lời cho ít nhất một case.', 400);
  }
  const seen = new Set();
  const answers = data.answers.map(answer => {
    if (!answer || !Object.hasOwn(labels, answer.id) || seen.has(answer.id) ||
        typeof answer.answer !== 'string' || !answer.answer.trim() || answer.answer.length > 45000) {
      throw new AppError('Câu trả lời không hợp lệ hoặc vượt quá 45.000 ký tự mỗi case.', 400);
    }
    seen.add(answer.id);
    return { id: answer.id, label: labels[answer.id], answer: answer.answer };
  });
  return { submissionId: data.submissionId, name: data.name.trim(), answers };
}
async function callSheets(payload, fetchImpl = fetch) {
  const url = process.env.GOOGLE_SCRIPT_URL || DEFAULT_URL;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new AppError('Địa chỉ nhận bài chưa được cấu hình đúng.', 503);
  }
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload), redirect: 'follow', signal: AbortSignal.timeout(25000)
    });
  } catch (error) {
    throw new AppError('Máy chủ chưa nhận được xác nhận lưu bài. Bản nháp vẫn được giữ; vui lòng thử lại.', 504);
  }
  if (!response.ok || response.url?.startsWith('https://accounts.google.com/')) {
    throw new AppError('Dịch vụ lưu bài đang không truy cập được. Vui lòng thử lại sau.');
  }
  let result;
  try { result = await response.json(); }
  catch { throw new AppError('Dịch vụ lưu bài chưa trả về xác nhận hợp lệ.'); }
  if (!result || result.ok !== true) {
    throw new AppError(payload.action === 'list'
      ? 'Chưa tải được danh sách bài nộp. Bản Apps Script cần hỗ trợ chức năng đọc bài.'
      : 'Chưa xác nhận được việc lưu bài vào Google Sheets. Vui lòng thử lại.');
  }
  return result;
}
module.exports = { AppError, validateSubmission, callSheets };
