/**
 * タイトルからカテゴリ名を推定（v3 ルールベース。将来 LLM に差し替え可能）
 */
const RULES: { category: string; keywords: string[] }[] = [
  {
    category: '開発',
    keywords: ['api', 'コード', '実装', 'バグ', 'fix', 'deploy', 'pr', 'レビュー', '設計', '仕様'],
  },
  { category: '事務', keywords: ['請求', '経費', '書類', '契約', '申請', '税', '振込', 'invoice'] },
  {
    category: '連絡',
    keywords: ['メール', '返信', '連絡', '電話', 'slack', 'discord', '打合', 'ミーティング'],
  },
  {
    category: '生活',
    keywords: ['買い物', '掃除', '洗濯', '料理', '水やり', '植物', '病院', '運動'],
  },
  { category: '学習', keywords: ['読書', '勉強', '学ぶ', '講座', '資格', '復習'] },
  { category: 'クリエイティブ', keywords: ['記事', '執筆', 'デザイン', '動画', '写真', 'ブログ'] },
];

export type CategorySuggestion = {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

export function suggestCategoryName(title: string): CategorySuggestion {
  const normalized = title.trim().toLowerCase();

  if (!normalized) {
    return { name: 'その他', confidence: 'low', reason: 'タイトルが空のためデフォルトです' };
  }

  for (const rule of RULES) {
    const hit = rule.keywords.find((kw) => normalized.includes(kw));
    if (hit) {
      return {
        name: rule.category,
        confidence: 'high',
        reason: `「${hit}」に関連するキーワードが含まれています`,
      };
    }
  }

  if (normalized.length <= 12) {
    return { name: 'クイック', confidence: 'medium', reason: '短いタスクはすぐ終わる想定です' };
  }

  return { name: 'その他', confidence: 'low', reason: '該当ルールがありませんでした' };
}
