import { appStore, type LoadError } from '../../store/appStore';

const HINTS: Record<string, string> = {
  NETWORK: 'Máy của bạn cần truy cập được docs.google.com và *.googleusercontent.com.',
  ACCESS_DENIED: 'Nhờ chủ sheet bật chia sẻ "Anyone with the link" (hoặc Publish to web) rồi thử lại.',
  NOT_FOUND: 'Kiểm tra lại dataSource.url trong config.json trên server.',
  CONFIG: 'Sửa file config.json cạnh index.html trên server rồi tải lại trang.',
  MISSING_COLUMNS: 'Có thể tiêu đề cột trong sheet đã bị đổi tên. So sánh với cấu trúc chuẩn trong tài liệu.',
};

export function ErrorScreen({ error }: { error: LoadError }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠
      </p>
      <h1 className="mt-3 text-lg font-semibold">{error.title}</h1>
      <p className="mt-2 text-sm text-ink-2">{error.message}</p>
      {HINTS[error.code] && <p className="mt-2 text-xs text-ink-3">{HINTS[error.code]}</p>}
      <p className="mt-1 font-mono text-[10px] text-ink-3">mã lỗi: {error.code}</p>
      <button type="button" onClick={() => void appStore.getState().load()} className="mt-5 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1 hover:bg-ai-1/30">
        Thử lại
      </button>
    </div>
  );
}
