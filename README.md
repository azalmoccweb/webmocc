# Crew Request System

Bu paket airline / crew request-ləri email-dən oxuyub paneldə idarə etmək üçündür.

Dəstəklənən request tipləri:
- Day Off Request
- Vacation Request
- Sick Request

Sistem nə edir:
- Gmail inbox-a gələn email-ləri oxuyur
- Subject və body üzrə request tipini tanıyır
- Routing rule-a görə xüsusi şəxsə yönləndirir
- Pending, Approved, Rejected, Manual Review status-ları ilə saxlayır
- Request-in neçə müddətdir açıq olduğunu göstərir
- Audit log saxlayır

## Texnologiyalar
- Node.js + Express + EJS
- PostgreSQL
- Gmail IMAP polling
- Railway deploy-ready

## Lokal başlatma

```bash
cp .env.example .env
npm install
npm start
```

## Railway deploy

### 1) GitHub-a yüklə
Bu qovluğu GitHub repo kimi push et.

### 2) Railway-də project yarat
- New Project
- Deploy from GitHub Repo
- Bu repo-nu seç

### 3) PostgreSQL əlavə et
- Railway project içində **New** → **Database** → **PostgreSQL**
- Railway avtomatik `DATABASE_URL` verəcək

### 4) Variables / Env daxil et
Railway service içində **Variables** bölməsinə bunları yaz:

```env
PORT=3000
NODE_ENV=production
APP_NAME=Crew Request System
APP_URL=https://your-app.up.railway.app
SESSION_SECRET=super_long_random_secret
DEFAULT_ADMIN_NAME=Admin
DEFAULT_ADMIN_EMAIL=admin@company.com
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
GMAIL_ENABLED=true
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
GMAIL_HOST=imap.gmail.com
GMAIL_PORT=993
GMAIL_TLS=true
GMAIL_MAILBOX=INBOX
GMAIL_MAX_FETCH_PER_SYNC=30
GMAIL_SOCKET_TIMEOUT_MS=600000
POLL_INTERVAL_MS=60000
ALLOWED_SENDER_DOMAINS=company.com
TZ=Asia/Baku
```

### 5) Deploy bitəndən sonra login
- app URL aç
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

İlk login-dən sonra Settings səhifəsində approver user-lər yarat:
- X adam
- Y adam
- Z adam

Sonra routing qur:
- Day Off → X
- Vacation → Y
- Sick → Z

## Email acceptance rule

System now only imports emails whose **subject contains the word `Request`**.

Examples that will be imported:
- `Day Off Request`
- `Vacation Request`
- `Sick Request`

Examples that will be ignored:
- `Hello`
- `Security alert`
- `Meeting notes`

If the subject contains `Request` but the exact type is unclear, the email goes to **Manual Review**.

## Gmail setup

Bu layihə Gmail IMAP ilə mail oxuyur.

### Normal Gmail hesabı üçün
1. Google account-a daxil ol
2. 2-Step Verification aktiv et
3. Google Account içində **App Passwords** aç
4. `Mail` üçün yeni app password yarat
5. Verilən 16 simvollu şifrəni `GMAIL_APP_PASSWORD` kimi Railway Variables-a yaz
6. `GMAIL_USER` olaraq Gmail ünvanını yaz

### Google Workspace üçün
Əgər şirkət domain-i Workspace istifadə edirsə:
1. Admin Console-a gir
2. Gmail xidmətində IMAP access açıq olsun
3. Lazımdırsa third-party IMAP client istifadəsinə icazə ver
4. Sonra istifadəçi üçün app password və ya uyğun auth siyasəti ilə mailbox bağlantısı qur

## İş prinsipi

### Email formatı tövsiyəsi
Subject-ləri belə standard et:
- `Day Off Request`
- `Vacation Request`
- `Sick Request`

Bu classification dəqiqliyini artırır.

### Classification qaydası
- `day off`, `day-off`, `dayoff` → `DAY_OFF`
- `vacation`, `annual leave`, `leave request` → `VACATION`
- `sick`, `medical leave`, `doctor`, `flu` → `SICK`
- tapılmasa → `MANUAL_REVIEW`

### Status-lar
- `PENDING`
- `APPROVED`
- `REJECTED`
- `MANUAL_REVIEW`

## Əsas səhifələr
- `/login`
- `/` dashboard
- `/requests`
- `/requests/:id`
- `/settings`

## Əlavə qeydlər
- Gmail polling interval `POLL_INTERVAL_MS` ilə idarə olunur
- `GMAIL_MAX_FETCH_PER_SYNC` bir sync dövründə neçə unread email işlənəcəyini məhdudlaşdırır
- `GMAIL_SOCKET_TIMEOUT_MS` böyük mailbox-larda timeout riskini azaldır
- `ALLOWED_SENDER_DOMAINS` ilə yalnız müəyyən domain-lərdən gələn request-ləri qəbul edə bilərsən
- Request age `received_at` tarixindən hesablanır
- Gmail-də görülən email-lər `Seen` flag alır ki təkrar işlənməsin
- DB-də `gmail_uid` unikaldır, duplicate request qarşısını alır

## Təhlükəsizlik tövsiyələri
- Production-da güclü `SESSION_SECRET` istifadə et
- Admin default şifrəsini ilk gün dəyiş
- Yalnız şirkət domain-lərinə icazə ver
- Gmail üçün ayrıca service mailbox istifadə et, şəxsi mailbox yox

## Mümkün növbəti inkişaflar
- Email notification approve/reject cavabı
- Attachment upload və saxlanma
- SLA warning email-ləri
- CSV export
- OpenAI classification fallback
- Google OAuth login
