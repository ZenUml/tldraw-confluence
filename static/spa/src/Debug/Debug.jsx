import { WHITEBOARD_BUILD_METADATA } from '../buildMetadata';

export default function Debug() {
  const metadata = WHITEBOARD_BUILD_METADATA;
  return (
    <div
      data-testid="whiteboard-build-identity"
      className="absolute right-2 top-2 z-50 rounded bg-slate-900/80 px-2 py-1 text-[10px] text-white"
      title="Whiteboard build identity"
    >
      {metadata.app_version}@{metadata.app_commit.slice(0, 7)} · SDK {metadata.sdk_version} · {metadata.environment_type}
    </div>
  );
}
