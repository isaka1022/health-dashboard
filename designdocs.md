# AIダッシュボード アプリ仕様書 / Design Docs

---

## 1. プロダクト概要

* **名称（仮）**：Circadian AI Dashboard
* **一言説明**：自分の食事ログ・健康データ・サーカディアン指標を横断解析し、最適な“時間×栄養×行動”を提案するAIダッシュボード。
* **対象ユーザー**：知的労働者・経営者・クリエイター（25–45歳）で“パフォーマンス最適化”志向、ウェアラブル利用者、食事ログを継続できる層。
* **主要ユースケース**：

  1. 食事・睡眠・活動の時系列統合→日次スコアと因果洞察を提示
  2. 食事時間帯・就寝起床・光曝露に基づく“リズムアラート/リマインド”
  3. 習慣の実験（例：食事ウィンドウ12h→10h）と効果検証レポート
* **北極星KPI**：週あたり「Circadian Aligned Days（CAD ≥ 80）」の比率

---

## 2. 要件定義

### 2.1 MVPスコープ（MoSCoW）

* **Must**：

  * Webアプリ（Next.js）で稼働
  * GoogleスプレッドシートURLからのデータ取り込み（公開CSVモード）
  * CSV/シートを解析しCADスコアを算出
  * 日次ダッシュボードでCADと内訳を表示
* **Should**：

  * Google OAuthでDrive連携
  * Apple HealthエクスポートXMLアップロード対応
  * 週次レポートと実験トラッキング
* **Could**：

  * 通知機能（Email/ブラウザ）
  * 栄養素や食品バーコード認識
* **Won’t**：

  * 医療診断や医療機器相当の機能

### 2.2 ユーザーストーリー例

* US-01：As a ユーザー, I want to DriveシートURLを貼るだけで同期 so that 手動CSV不要で継続できる。
* US-02：As a ユーザー, I want to 今日のCADと要因を一目で知る so that 行動を絞れる。
* US-03：As a iPhoneユーザー, I want to Apple Healthのエクスポートを投げる so that 過去データを一括で取り込める。

### 2.3 非機能要件

* **セキュリティ**：OAuth最小権限、暗号化保存、健康データのPII分離
* **パフォーマンス**：取り込み処理 ≤20s（初回）、差分同期 ≤5s
* **可用性**：SLO 99.5%
* **国際化**：日本語 → 英語対応

---

## 3. 技術選定

### 3.1 フロントエンド

* Next.js 14 + TypeScript
* TailwindCSS + shadcn/ui
* React Query / Zod / react-hook-form
* Recharts
* NextAuth (Email/Google OAuth)

### 3.2 バックエンド

* Node.js 20 (Next.js API Routes)
* **ORM**：Prisma + PostgreSQL (Supabase)
* ジョブ管理：BullMQ (Redis) or Cloud Tasks
* ファイル処理：S3互換ストレージ
* Apple Healthパース：fast-xml-parser
* Google Sheets取得：Sheets API or `export?format=csv`

### 3.3 インフラ

* Vercel（FE+軽量API）
* Cloud Run（重処理ワーカー）
* Supabase Postgres + Storage
* Upstash Redis（キュー）
* CI/CD：GitHub Actions
* 分析：PostHog / Mixpanel
* 監視：Sentry, Logtail/Datadog

### 3.4 セキュリティ

* OAuthはDrive readonlyのみ
* Apple Healthファイルは一時保存後即削除
* Importログは監査用に保持

---

## 4. 基本設計

### 4.1 アーキテクチャ図

```mermaid
flowchart LR
  U[User(Web)] --> FE[Next.js]
  FE --> API[API Routes]
  API --> DB[(Postgres)]
  API --> Q[[Queue]]
  Q --> W[Worker (Cloud Run)]
  W --> G[Google Sheets]
  W --> S3[(Storage)]
  W --> DB
  FE --> Analytics[(PostHog/Mixpanel)]
```

### 4.2 データモデル（Prisma抜粋）

* User, GoogleSheetSource, AppleHealthImport
* Meal, SleepSession, Activity
* CircadianMetric（CAD算出結果）
* ImportLog

### 4.3 APIエンドポイント（REST）

* `POST /sources/sheet` – URL検証＆ジョブ投入
* `POST /sources/sheet/:id/sync` – 差分同期
* `POST /imports/apple-health` – export.zipアップロード
* `GET /dashboard?date=YYYY-MM-DD` – CADスコアと内訳取得
* `POST /recommendations/:id/accept`

### 4.4 GraphQL（併用）

* Query: `dashboard`, `circadianMetrics`, `sources`
* Mutation: `createSheetSource`, `syncSheetSource`, `requestAppleHealthUpload`, `acceptRecommendation`
* GraphQLはダッシュボード/分析取得用、RESTはアップロード/大規模処理用

### 4.5 CAD算出ロジック

* **v0（シート集計のみ）**：睡眠量/効率、起床一貫性、活動バランス
* **v1（Apple Health/Meals追加）**：食事ウィンドウ長、最終摂食→就寝間隔、起床一貫性

---

## 5. ロードマップ

* **M0（2週）**：Web, Drive URLインポート（公開モード）, CAD可視化
* **M1（+3週）**：Drive OAuth + Apple Health XML対応 + マッピングUI
* **M2（+4週）**：週次実験UI, Stripe課金, 通知
* **M3**：iOSネイティブ（HealthKit連携）

---

## 6. 付録

### 6.1 シートテンプレ

* Meals: occurred\_at, label, notes, photo\_url
* Sleep: start\_at, end\_at, source, quality
* Activity: type, start\_at, duration\_min, intensity

### 6.2 サンプルシート（DailySummary v0）対応

* 必須: Date
* 推奨: 睡眠, 心拍, 活動, 栄養
* v0では睡眠中心、v1で食事タイミング拡張

---

以上。MVPを素早く立ち上げる仕様と設計を整理しました。
