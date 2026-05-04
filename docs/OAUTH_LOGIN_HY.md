# Google, Facebook և Apple մուտք/գրանցում — ինչ է պետք (քայլ առ քայլ)

Այս նախագծում սոցիալ մուտքը աշխատում է **OAuth 2.0**-ով backend API-ի վրա։ **iCloud**-ը որպես առանձին «մուտքի մեթոդ» չի տրամադրվում՝ Apple-ի կողմից վեբում օգտագործվում է **Sign in with Apple** (մուտք **Apple ID**-ով, որը կապված է iCloud հաշվի հետ)։

---

## 0. Ընդհանուր՝ նախքան ցանկացած պրովայդեր

1. **Հաշիվներ**
   - **Google** — սովորական Google հաշիվ ([Google Cloud Console](https://console.cloud.google.com/)-ի համար)։
   - **Facebook** — Facebook հաշիվ ([Meta for Developers](https://developers.facebook.com/)։
   - **Apple** — վճարովի **[Apple Developer Program](https://developer.apple.com/programs/)** (տարեկան վճար)։ Անվճար Apple ID-ով վեբի Sign in with Apple-ը ամբողջությամբ կարգավորել չեք կարող։

2. **Հանրային API հասցե (`API_PUBLIC_URL`)**  
   Backend-ի `.env`-ում պետք է լինի այն **base URL**-ը, որը **դիտարկիչը** տեսնում է որպես API (օր. `https://viva.example.am` կամ dev-ում `http://localhost:5173`, եթե Vite-ը proxy-ով է ուղարկում `/api/v1`-ը backend-ին)։  
   Սա պետք է **ճիշտ նույնը** լինի, ինչը կգրեք OAuth redirect URI-ների մեջ։

3. **Callback URL-ները** (յուրաքանչյուր պրովայդերի կոնսոլում **ճիշտ այս ձևով** գրանցեք, `API_PUBLIC_URL`-ը փոխարինեք ձեր արժեքով).

   | Պրովայդեր | Redirect URI |
   |-----------|----------------|
   | Google | `{API_PUBLIC_URL}/api/v1/auth/oauth/google/callback` |
   | Facebook | `{API_PUBLIC_URL}/api/v1/auth/oauth/facebook/callback` |
   | Apple | `{API_PUBLIC_URL}/api/v1/auth/oauth/apple/callback` |

   Օրինակ production-ում, եթե `API_PUBLIC_URL=https://api.yourdomain.am` է, Google-ի համար կլինի՝  
   `https://api.yourdomain.am/api/v1/auth/oauth/google/callback`։

4. **Backend `.env` փոփոխականներ** (նախագծի `backend/.env.example`-ում արդեն նշված են անունները)։
   - Google՝ `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`
   - Facebook՝ `OAUTH_FACEBOOK_APP_ID`, `OAUTH_FACEBOOK_APP_SECRET`
   - Apple՝ `OAUTH_APPLE_CLIENT_ID`, `OAUTH_APPLE_TEAM_ID`, `OAUTH_APPLE_KEY_ID`, `OAUTH_APPLE_PRIVATE_KEY`

---

## 1. Google մուտք և գրանցում

**Ինչ եք ստանում.** Web client-ի **Client ID** և **Client Secret**։

1. Բացեք [Google Cloud Console](https://console.cloud.google.com/) → ստեղծեք նոր **Project** (կամ ընտրեք գոյություն ունեցողը)։
2. **APIs & Services** → **OAuth consent screen**։
   - Ընտրեք **External** (կամ Internal, եթե միայն ձեր org-ի domain է)։
   - Լրացրեք հավելվածի անունը, support email, developer contact։
   - **Scopes** — նախագիծը օգտագործում է `openid`, `email`, `profile` (Google-ի auth endpoint-ում արդեն նշված են համարժեք scope-երը)։
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**։
   - Application type՝ **Web application**։
   - **Authorized redirect URIs** — ավելացրեք ձեր `.../api/v1/auth/oauth/google/callback` URL-ը (տես վերևի աղյուսակը)։
4. Պահպանեք **Client ID** և **Client Secret**։
5. Backend `.env`՝
   ```env
   OAUTH_GOOGLE_CLIENT_ID=....apps.googleusercontent.com
   OAUTH_GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```
6. **Production** — OAuth consent screen-ում հավելվածը **Publish** արեք (կամ թեստի համար ավելացրեք test users)։

---

## 2. Facebook մուտք և գրանցում

**Ինչ եք ստանում.** **App ID** և **App Secret**։

1. Մուտք գործեք [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App**։
2. Տեսակը ընտրեք ըստ Meta-ի առաջարկվող տարբերակների (սովորաբար **Consumer** կամ այն տիպը, որը թույլ է տալիս **Facebook Login**)։
3. Ավելացրեք **Facebook Login** արտադրանքը (product)։
4. **Facebook Login** → **Settings**։
   - **Valid OAuth Redirect URIs** — ավելացրեք `.../api/v1/auth/oauth/facebook/callback` (նույն `API_PUBLIC_URL`-ով)։
5. **Settings** → **Basic** — այստեղ են **App ID** և **App Secret** (Secret-ը ցույց տալու կոճակով)։
6. Backend `.env`՝
   ```env
   OAUTH_FACEBOOK_APP_ID=
   OAUTH_FACEBOOK_APP_SECRET=
   ```
7. Եթե հավելվածը **Development mode**-ում է, մուտքը սովորաբար միայն **Roles** (Admin, Developer, Tester) ունեցող հաշիվներով է աշխատում՝ մինչև Live եք անում consent և policy պահանջներով։

---

## 3. Apple (Sign in with Apple) — հաճախ կոչում են «iCloud», բայց տեխնիկապես Apple ID

**Ինչ եք ստանում.** **Services ID** (կոդում՝ `OAUTH_APPLE_CLIENT_ID`), **Team ID**, **Key ID**, **.p8 private key**։

1. Մուտք [developer.apple.com](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles**։
2. **Identifiers** → **+** → **Services IDs** → ստեղծեք նոր ID (օր. `com.yourcompany.viva.web`) — սա է **Client ID**-ն backend-ում։
3. Ընտրեք այդ Services ID-ն → միացրեք **Sign in with Apple** → **Configure**։
   - **Return URLs** — ավելացրեք `.../api/v1/auth/oauth/apple/callback` (HTTPS production-ում)։
4. **Identifiers** → **App IDs** — պետք է լինի հավելվածի App ID, որին կապված է Sign in with Apple (նույն team-ում)։
5. **Keys** → **+** → միացրեք **Sign in with Apple** → ստեղծեք key → ներբեռնեք **.p8** ֆայլը **մեկ անգամ** (Apple-ը secret-ը չի պահում)։
   - Նշեք **Key ID**-ն։
6. **Team ID** — `Membership` / հաշվի էջում (10 նիշ, օր. `ABCDE12345`)։
7. `.p8` ֆայլի բովանդակությունը PEM ձևով պետք է գրեք `.env`-ում։ Նոր տողերը env-ում հաճախ escape են անում `\n`-ով (նախագծի մեկնաբանությունը՝ `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`)։
8. Backend `.env`՝
   ```env
   OAUTH_APPLE_CLIENT_ID=com.yourcompany.viva.web
   OAUTH_APPLE_TEAM_ID=
   OAUTH_APPLE_KEY_ID=
   OAUTH_APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
   ```

---

## 4. Վերջում՝ ստուգում

1. Լրացրեք `API_PUBLIC_URL` և վերևի բոլոր OAuth key-երը `backend/.env`-ում։
2. Վերագործարկեք API սերվերը։
3. Կայքից բացեք մուտքի էջը և փորձեք Google / Facebook / Apple կոճակները։  
   Եթե redirect mismatch սխալ է՝ կրկին համեմատեք պրովայդերի կոնսոլում գրված URL-ը `API_PUBLIC_URL` + `/api/v1/auth/oauth/<provider>/callback` բանաձևի հետ (առանց վերջում `/` ավելորդի)։

---

## Կարճ աղյուսակ

| Պրովայդեր | Որտեղից | Ինչ եք պահում `.env`-ում |
|-----------|---------|---------------------------|
| Google | Google Cloud → Credentials | Client ID, Client Secret |
| Facebook | Meta Developers → App | App ID, App Secret |
| Apple | Apple Developer → Services ID + Key | Services ID, Team ID, Key ID, .p8 PEM |

Եթե ունեք միայն **Apple iCloud** որպես պահեստ, այն **OAuth login** չի տրամադրում՝ վեբ մուտքի համար պետք է **Sign in with Apple** կարգավորումը վերևում նկարագրված քայլերով։
