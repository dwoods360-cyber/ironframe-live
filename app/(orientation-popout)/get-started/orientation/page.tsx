import OrientationWalkthroughPlayer from "@/app/components/onboarding/OrientationWalkthroughPlayer";
import OrientationVideoPopoutPlayer from "@/app/components/onboarding/OrientationVideoPopoutPlayer";
import { withGetStartedAudioCacheBust } from "@/app/lib/getStartedAudioAsset";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orientation Walkthrough | Ironframe",
  description: "Get Started visual orientation with synced narration.",
};

function isOrientationAudioUrl(url: string): boolean {
  return /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url);
}

export default function OrientationWalkthroughPage() {
  const mediaUrl = process.env.NEXT_PUBLIC_GET_STARTED_VIDEO_URL?.trim();

  if (!mediaUrl) {
    return (
      <div className="ironframe-orientation-surface flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] p-6 text-center text-sm text-[var(--login-muted)]">
        Orientation media is not configured. Set{" "}
        <code className="text-[var(--login-accent)]">NEXT_PUBLIC_GET_STARTED_VIDEO_URL</code> in your
        environment.
      </div>
    );
  }

  if (!isOrientationAudioUrl(mediaUrl)) {
    return <OrientationVideoPopoutPlayer src={mediaUrl} />;
  }

  return <OrientationWalkthroughPlayer audioSrc={withGetStartedAudioCacheBust(mediaUrl)} autoStart />;
}
