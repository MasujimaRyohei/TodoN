# タスクポイントシステム

## User Prompt / Context

> ポイント機能を実装したい
>
> - タスクへのポイントはそのプロジェクトによって重さが変わってくる
> - メインタスクの作成、サブタスクの作成には権限があり、作成できる人が違う
> - メインタスクの方が権限が厳しいので、そこで上長がポイントを割り振る
> - サブタスクはメインタスクで割り振られたポイント分でしか割り振れない

コミット `286d861`「Start to dev task point system」で中断していた機能。スキーマ列
`Task.points` と `packages/shared/src/task-points.ts`、未接続の `server/team-points.ts`
のみ存在していた状態から作り直す。

## 決定事項（実装方針）

| 論点                 | 決定                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| プロジェクト別の重さ | プロジェクト側に設定は持たない。上長がメインタスク作成/編集時に `points` を直接入力する（`weight` は初期値の目安）。                                                                                                           |
| メインタスク作成権限 | チーム設定 `Team.mainTaskCreateRole`（`owner`/`admin`/`member`、既定 `admin`）以上のロールのみ。ポイントの設定・変更も同じ権限。                                                                                               |
| サブタスク作成権限   | チームメンバーなら誰でも（タスク編集権限に準拠）。                                                                                                                                                                             |
| サブタスクのポイント | `SubTask.points`（Int, 既定 0）。同一タスク内の合計が親タスクの `points` を超えられない。                                                                                                                                      |
| ポイント獲得         | サブタスク完了時、完了した人が `subtask.points` を獲得（`SubTask.completedById` / `completedAt` に記録）。サブタスクの無いメインタスクを完了した場合はその人が `task.points` を獲得（activity log から集計、既存挙動を踏襲）。 |
| 集計                 | 専用の台帳テーブルは作らず、`SubTask` の完了情報 + activity log から再構成（`server/team-points.ts`）。                                                                                                                        |
| 個人スコープ         | `points` はオーナーが自由に設定可（権限チェックなし）。                                                                                                                                                                        |

## スキーマ変更（`apps/web/prisma/schema.prisma`）

```prisma
model Team {
  // ...
  mainTaskCreateRole String @default("admin") // owner | admin | member
}

model SubTask {
  // ...
  points        Int       @default(0)
  completedById String?
  completedBy   User?     @relation("SubTaskCompletedBy", fields: [completedById], references: [id], onDelete: SetNull)
  completedAt   DateTime?
}

model User {
  // ...
  completedSubTasks SubTask[] @relation("SubTaskCompletedBy")
}
```

マイグレーション: `apps/web/prisma/migrations/<timestamp>_add_task_point_allocation/`

## 実装ステップ

1. スキーマ + マイグレーション + `pnpm db:generate`
2. `@todon/shared` types: `SubTask` に `points` / `completedById` / `completedAt`、`Team` に `mainTaskCreateRole`。`resolveSubtaskBudget` ヘルパを `task-points.ts` に追加。
3. `server/team-access.ts`: `ROLE_RANK` / `roleMeetsMin` / `requireMainTaskCreator`。
4. `server/tasks.ts` + `server/team-tasks.ts`:
   - `createTask`/`updateTask` で `points` を永続化。チーム主タスクは `requireMainTaskCreator`。
   - `createSubtask`/`updateSubtask` で `points` を受け取り、予算超過を検証。
   - `updateSubtask` で `completed` 切り替え時に `completedById` / `completedAt` を設定/クリア。
5. `lib/schemas.ts`: `createSubtaskSchema` / `updateSubtaskSchema` に `points`。`taskBodySchema.points` は既存。
6. `lib/mappers.ts`: `mapSubTask` に新フィールド。
7. `server/team-points.ts`: サブタスク完了ベースの集計に書き換え。
8. API: `GET /api/teams/[id]/points`、`PATCH /api/teams/[id]` に `mainTaskCreateRole`。
9. Web UI:
   - `new-task-form` / `task-detail-client`: チーム主タスクの `points` 入力（権限が無ければ無効表示）。
   - `task-detail-client`: サブタスク追加にポイント入力 + 「残り N pt」。
   - チーム詳細ページ: ポイントランキング。
   - チーム設定: `mainTaskCreateRole` セレクタ（owner のみ）。
10. Mobile: `TaskDetailScreen` にポイント表示 + サブタスク追加のポイント入力。ランキングは後続。

## 実装状況（2026-09-04）

- ✅ ステップ 1〜10 実装完了（`develop` ブランチ）
- ✅ `tsc --noEmit`（web / mobile / shared）、`pnpm lint`（0 errors）、`next build` すべて通過
- ⚠️ **未適用**: マイグレーション `20260904120000_add_task_point_allocation`
- ⚠️ **未検証**: ランタイム動作。`apps/web/.env` の Supabase 接続が無効（`tenant not found`）でローカル DB に繋がらない
- Mobile はポイント表示のみ（サブタスク作成・配点編集は未実装、モバイル拡張フェーズ）

## Items to Confirm / Review

- ポイント台帳テーブルを作らず再構成で足りるか（履歴の改変耐性は低い）。
- サブタスク無し主タスク完了時の `task.points` 付与を残すか（個人利用の互換のため残す方針）。
- `mainTaskCreateRole` の既定値 `admin`。
