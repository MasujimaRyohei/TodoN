import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ReviewsClient } from '@/components/reviews-client';
import { getCurrentUserId } from '@/lib/auth/session';
import { listWeeklyReviews } from '@/server/weekly-review';

export default async function ReviewsPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect('/login');
  }

  const reviews = await listWeeklyReviews(userId);

  return (
    <div className="space-y-6">
      <div>
        <p className="todon-eyebrow">v1.5 · ルールベース</p>
        <h1 className="todon-page-title">週次振り返り</h1>
        <p className="todon-muted">
          完了数・保留・だいたいリピートの傾向から提案を生成します（将来 AI 連携予定）
        </p>
      </div>

      <ReviewsClient initialReviews={reviews} />

      <Link href="/dashboard" className="inline-block todon-link">
        ← ダッシュボードへ
      </Link>
    </div>
  );
}
