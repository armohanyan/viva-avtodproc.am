import type { Lang } from "src/lib/i18n";

export type LegalSection = { title: string; paragraphs: readonly string[] };

export type LegalDoc = {
  pageTitle: string;
  metaDescription: string;
  updated: string;
  sections: readonly LegalSection[];
};

const EN_PRIVACY: LegalDoc = {
  pageTitle: "Privacy Policy",
  metaDescription:
    "How Viva Autoschool collects, uses, and protects personal data when you use our website and services.",
  updated: "Last updated: 26 April 2026.",
  sections: [
    {
      title: "Who we are",
      paragraphs: [
        "Viva Autoschool operates this website and the online student services linked from it. The business identity, registered address, telephone number, and email address shown in the site footer and on the Contact page identify the data controller for personal data described in this policy.",
      ],
    },
    {
      title: "What personal data we process",
      paragraphs: [
        "Depending on how you use our services, we may process: your name; contact details (e.g. phone number, email); account login details; booking and lesson information; communications you send us; technical information such as IP address, browser type, device identifiers, and security logs; and payment-related metadata (such as amount, currency, transaction status, and timestamps).",
        "When you pay by card online, card numbers and security codes are entered only on the secure payment page hosted by our acquiring bank and its card-processing partners. We do not collect or store full card numbers or card security codes on our own servers.",
      ],
    },
    {
      title: "Purposes and legal bases",
      paragraphs: [
        "We use personal data to provide driving education services, manage accounts and bookings, communicate with you, process payments in cooperation with our bank, meet accounting and regulatory obligations, prevent fraud and misuse, improve and secure our systems, and enforce our terms.",
        "Processing is based where applicable on performance of a contract with you, our legitimate interests in operating a safe and reliable service, compliance with legal obligations, and consent where required by law.",
      ],
    },
    {
      title: "Sharing and processors",
      paragraphs: [
        "We share data with service providers who assist us (for example hosting, email delivery, and analytics configured to minimise personal data), and with payment and banking partners strictly as needed to authorise and settle card transactions and to meet financial compliance rules.",
        "We may disclose information if required by law, court order, or a competent public authority, or to protect the rights, safety, and property of our students, staff, and the public.",
      ],
    },
    {
      title: "International transfers",
      paragraphs: [
        "Some technology providers may process data outside the Republic of Armenia. Where such transfers occur, we rely on appropriate safeguards required by applicable law and contractual commitments from vendors.",
      ],
    },
    {
      title: "Retention",
      paragraphs: [
        "We keep personal data only as long as needed for the purposes above, including legal, tax, and accounting retention periods, fraud monitoring, and dispute resolution. When data is no longer required, we delete or anonymise it in line with our internal policies.",
      ],
    },
    {
      title: "Security",
      paragraphs: [
        "We implement appropriate technical and organisational measures to protect personal data against unauthorised access, loss, or alteration. No method of transmission over the Internet is completely secure; we encourage you to use strong passwords and protect your account credentials.",
      ],
    },
    {
      title: "Cookies and similar technologies",
      paragraphs: [
        "We use cookies and similar technologies that are strictly necessary for the operation of the site and your session (for example authentication and security). If we introduce optional analytics or marketing cookies, we will describe them here and, where required, ask for your consent before they are placed.",
      ],
    },
    {
      title: "Your rights",
      paragraphs: [
        "Subject to applicable law in the Republic of Armenia, you may have the right to request access, correction, deletion, or restriction of your personal data, to object to certain processing, and to lodge a complaint with a supervisory authority. To exercise your rights, contact us using the details on the Contact page.",
      ],
    },
    {
      title: "Children",
      paragraphs: [
        "Our services are intended for users who can lawfully enter into driving education contracts. If you believe we have processed a child's personal data without appropriate authority, please contact us and we will take appropriate steps.",
      ],
    },
    {
      title: "Changes",
      paragraphs: [
        "We may update this policy from time to time. The \"Last updated\" date at the top will change when we do. Material changes may also be announced through the website or by email where appropriate.",
      ],
    },
  ],
};

const EN_TERMS: LegalDoc = {
  pageTitle: "Terms of Service",
  metaDescription:
    "Terms governing use of the Viva Autoschool website, accounts, bookings, and related services.",
  updated: "Last updated: 26 April 2026.",
  sections: [
    {
      title: "Agreement",
      paragraphs: [
        "By accessing this website, creating an account, booking lessons, or purchasing packages, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, do not use our services.",
      ],
    },
    {
      title: "Services",
      paragraphs: [
        "Viva Autoschool provides driver training and related educational services as described on the website. Specific lesson times, locations, vehicles, instructors, and package contents may vary by branch and availability. We may update service descriptions and schedules to reflect operational needs.",
      ],
    },
    {
      title: "Accounts",
      paragraphs: [
        "You are responsible for the accuracy of information you provide and for keeping your login credentials confidential. You must notify us promptly of any unauthorised use of your account.",
      ],
    },
    {
      title: "Bookings and attendance",
      paragraphs: [
        "Bookings are subject to confirmation, instructor availability, and branch rules shown at the time of booking. Late cancellations or no-shows may incur fees or loss of prepaid lessons as disclosed in your booking flow or branch policy.",
      ],
    },
    {
      title: "Prices and taxes",
      paragraphs: [
        "Prices are shown in Armenian dram unless stated otherwise. Applicable taxes and fees will be disclosed before payment where required by law.",
      ],
    },
    {
      title: "Conduct",
      paragraphs: [
        "You agree not to misuse the website or portals (for example by attempting unauthorised access, interfering with other users, or uploading malware). We may suspend or terminate access for violations.",
      ],
    },
    {
      title: "Intellectual property",
      paragraphs: [
        "Content on this website (text, graphics, logos, and training materials made available through our services) is owned by Viva Autoschool or its licensors. You may not copy or redistribute it except as allowed by law or with our written permission.",
      ],
    },
    {
      title: "Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by applicable law in the Republic of Armenia, we are not liable for indirect or consequential damages arising from use of the website or services. Nothing in these terms excludes liability that cannot legally be excluded.",
      ],
    },
    {
      title: "Governing law and disputes",
      paragraphs: [
        "These terms are governed by the laws of the Republic of Armenia. Courts of Armenia have jurisdiction over disputes, without prejudice to mandatory consumer rights where applicable.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        "For questions about these terms, use the contact details published on the Contact page and in the site footer.",
      ],
    },
  ],
};

const EN_PAYMENTS: LegalDoc = {
  pageTitle: "Payments, security & refunds",
  metaDescription:
    "How Viva Autoschool accepts card payments with ACBA Bank, 3-D Secure, and our refund rules.",
  updated: "Last updated: 26 April 2026.",
  sections: [
    {
      title: "Card acceptance and our bank partner",
      paragraphs: [
        "Card payments for our services are processed through our acquiring relationship with ACBA Bank CJSC (\"ACBA Bank\") using industry-standard internet acquiring for e-commerce. Supported card brands and programmes are determined by ACBA Bank and the relevant card schemes (for example ArCa, Visa, Mastercard, and American Express where offered).",
      ],
    },
    {
      title: "3-D Secure and authentication",
      paragraphs: [
        "Online card payments use 3-D Secure authentication where required by the issuer and card scheme (such as Verified by Visa, Mastercard SecureCode, American Express SafeKey, and ArCa SecurePay). You may be redirected to your bank's authentication step before a payment is approved.",
      ],
    },
    {
      title: "Where card data is entered",
      paragraphs: [
        "Cardholder data is entered only on the secure payment interface provided by the bank and its payment processor, not on fields operated by Viva Autoschool. This reduces exposure of sensitive authentication data and supports compliance expectations for internet card acceptance.",
      ],
    },
    {
      title: "What we store",
      paragraphs: [
        "We may store payment transaction references, amounts, timestamps, and payment status in our systems for accounting, customer support, and dispute handling. We do not store full primary account numbers, full magnetic-stripe data, or card security codes on our servers.",
      ],
    },
    {
      title: "Completion of payment",
      paragraphs: [
        "A booking or purchase is confirmed only after we receive a successful authorisation or settlement confirmation from the payment platform, subject to our internal fraud and policy checks. If a payment fails or is reversed, associated services may be cancelled or suspended.",
      ],
    },
    {
      title: "Refunds",
      paragraphs: [
        "Refunds, where applicable, are processed in accordance with Armenian consumer protection law, the rules of the card schemes, and our published cancellation policy for the product you purchased. Refunds are credited to the original payment method where technically possible, or by another reasonable means agreed with you.",
        "Processing times may depend on ACBA Bank, card networks, and your issuing bank.",
      ],
    },
    {
      title: "Chargebacks and disputes",
      paragraphs: [
        "If you initiate a chargeback, we will provide supporting evidence to the acquirer as permitted by law and scheme rules. For billing questions, contact us first using the details on the Contact page so we can resolve the issue before a dispute is filed where possible.",
      ],
    },
    {
      title: "Receipts and invoices",
      paragraphs: [
        "We issue receipts or tax documentation as required by applicable law and our internal procedures. Please keep the confirmation email or receipt generated after successful payment.",
      ],
    },
    {
      title: "Security logos",
      paragraphs: [
        "Where ACBA Bank or the card schemes provide security programme marks (such as 3-D Secure or scheme acceptance logos), we may display them on the payment path or footer as authorised by the bank to help cardholders recognise legitimate acceptance.",
      ],
    },
    {
      title: "Changes",
      paragraphs: [
        "We may update this page when tariffs, bank integration, or legal requirements change. The \"Last updated\" date reflects the latest revision.",
      ],
    },
  ],
};

const RU_PRIVACY: LegalDoc = {
  pageTitle: "Политика конфиденциальности",
  metaDescription:
    "Как автошкола Viva собирает, использует и защищает персональные данные при использовании сайта и сервисов.",
  updated: "Последнее обновление: 26 апреля 2026 г.",
  sections: EN_PRIVACY.sections.map((s, i) => ({
    title: [
      "Кто мы",
      "Какие персональные данные мы обрабатываем",
      "Цели и правовые основания",
      "Передача данным и обработчики",
      "Трансграничная передача",
      "Хранение",
      "Безопасность",
      "Файлы cookie и аналогичные технологии",
      "Ваши права",
      "Дети",
      "Изменения",
    ][i]!,
    paragraphs: s.paragraphs,
  })) as LegalSection[],
};

const RU_TERMS: LegalDoc = {
  pageTitle: "Условия обслуживания",
  metaDescription:
    "Условия использования сайта Viva, учётных записей, записей на занятия и сопутствующих услуг.",
  updated: "Последнее обновление: 26 апреля 2026 г.",
  sections: EN_TERMS.sections.map((s, i) => ({
    title: [
      "Соглашение",
      "Услуги",
      "Учётные записи",
      "Запись и посещение",
      "Цены и налоги",
      "Поведение пользователей",
      "Интеллектуальная собственность",
      "Ограничение ответственности",
      "Применимое право и споры",
      "Контакты",
    ][i]!,
    paragraphs: s.paragraphs,
  })) as LegalSection[],
};

const RU_PAYMENTS: LegalDoc = {
  pageTitle: "Оплата, безопасность и возвраты",
  metaDescription:
    "Как Viva принимает платежи картой через ACBA Bank, 3-D Secure и правила возвратов.",
  updated: "Последнее обновление: 26 апреля 2026 г.",
  sections: EN_PAYMENTS.sections.map((s, i) => ({
    title: [
      "Приём карт и банк-эквайер",
      "3-D Secure и аутентификация",
      "Где вводятся данные карты",
      "Что мы храним",
      "Завершение оплаты",
      "Возвраты",
      "Чарджбэки и споры",
      "Квитанции и счета",
      "Знаки безопасности",
      "Изменения",
    ][i]!,
    paragraphs: s.paragraphs,
  })) as LegalSection[],
};

const AM_PRIVACY: LegalDoc = {
  pageTitle: "Գաղտնիության քաղաքականություն",
  metaDescription:
    "Ինչպես է Viva ավտոդպրոցը հավաքում, օգտագործում և պաշտպանում անձնական տվյալները կայքի և ծառայությունների օգտագործման ժամանակ։",
  updated: "Վերջին թարմացումը՝ 26 ապրիլի, 2026 թ․",
  sections: EN_PRIVACY.sections.map((s, i) => ({
    title: [
      "Ով ենք մենք",
      "Ինչ անձնական տվյալներ ենք մշակում",
      "Նպատակներ և իրավական հիմքեր",
      "Տվյալների փոխանցում և մշակողներ",
      "Միջազգային փոխանցումներ",
      "Պահպանում",
      "Անվտանգություն",
      "Cookie-ներ և նմանատիպ տեխնոլոգիաներ",
      "Ձեր իրավունքները",
      "Երեխաներ",
      "Փոփոխություններ",
    ][i]!,
    paragraphs: s.paragraphs,
  })) as LegalSection[],
};

const AM_TERMS: LegalDoc = {
  pageTitle: "Ծառայությունների պայմաններ",
  metaDescription:
    "Viva կայքի, հաշիվների, ամրագրումների և կից ծառայությունների օգտագործման պայմանները։",
  updated: "Վերջին թարմացումը՝ 26 ապրիլի, 2026 թ․",
  sections: EN_TERMS.sections.map((s, i) => ({
    title: [
      "Պայմանագիր",
      "Ծառայություններ",
      "Հաշիվներ",
      "Ամրագրում և ներկայություն",
      "Գներ և հարկեր",
      "Վարքագիծ",
      "Ինտելեկտուալ սեփականություն",
      "Պատասխանատվության սահմանափակում",
      "Կիրառելի օրենքը և վեճերը",
      "Կապ",
    ][i]!,
    paragraphs: s.paragraphs,
  })) as LegalSection[],
};

const AM_PAYMENTS: LegalDoc = {
  pageTitle: "Վճարումներ, անվտանգություն և վերադարձներ",
  metaDescription:
    "Ինչպես է Viva-ն ընդունում քարտային վճարումները ACBA բանկի միջոցով, 3-D Secure և վերադարձի կանոնները։",
  updated: "Վերջին թարմացումը՝ 26 ապրիլի, 2026 թ․",
  sections: EN_PAYMENTS.sections.map((s, i) => ({
    title: [
      "Քարտերի ընդունում և բանկային գործընկեր",
      "3-D Secure և նույնականացում",
      "Որտեղ են մուտքագրվում քարտի տվյալները",
      "Ինչ ենք պահում",
      "Վճարման ավարտ",
      "Վերադարձներ",
      "Չարջբեքներ և վեճեր",
      "Ապացույցներ և հաշիվ-ապրանքագրեր",
      "Անվտանգության լոգոներ",
      "Փոփոխություններ",
    ][i]!,
    paragraphs: s.paragraphs,
  })) as LegalSection[],
};

/** Armenian body text for privacy (professional summary aligned with EN). */
AM_PRIVACY.sections = [
  {
    title: AM_PRIVACY.sections[0]!.title,
    paragraphs: [
      "Viva ավտոդպրոցը գործարկում է այս կայքը և դրանից կապակցված առցանց ուսանողական ծառայությունները։ Կայքի վերջնագրում և Կապ էջում նշված գործարար անունը, գրանցված հասցեն, հեռախոսահամարն ու էլ․ փոստը որոշում են այս քաղաքականությամբ նկարագրված անձնական տվյալների վերահսկողին։",
    ],
  },
  {
    title: AM_PRIVACY.sections[1]!.title,
    paragraphs: [
      "Ծառայություններից կախված՝ մենք կարող ենք մշակել՝ անուն, կապի տվյալներ (հեռախոս, էլ․ փոստ), մուտքի տվյալներ, ամրագրումների և դասերի տեղեկություն, մեզ ուղարկված հաղորդագրություններ, տեխնիկական տվյալներ (IP հասցե, դիտարկիչի տեսակ, սարքի նույնացուցիչներ, անվտանգության մատյաններ) և վճարման մետատվյալներ (գումար, արժույթ, գործարքի կարգավիճակ, ժամանակագրություն)։",
      "Քարտով առցանց վճարելիս քարտի համարները և անվտանգության կոդերը մուտքագրվում են միայն մեր էքվայեր բանկի և քարտային մշակման գործընկերների ապահով վճարման էջում։ Մեր սերվերներում չենք պահում ամբողջական քարտի համարներ կամ քարտի անվտանգության կոդեր։",
    ],
  },
  {
    title: AM_PRIVACY.sections[2]!.title,
    paragraphs: [
      "Տվյալներն օգտագործում ենք վարորդական ուսուցման ծառայություններ մատուցելու, հաշիվներ և ամրագրումներ կառավարելու, ձեզ հետ կապ պահելու, բանկի հետ համագործակցությամբ վճարումներ մշակելու, հաշվապահական և կարգավորիչ պարտավորություններ կատարելու, խարդախություն և չարաշահում կանխարգելելու, համակարգերը բարելավելու և անվտանգ պահելու, ինչպես նաև մեր պայմանները կիրառելու համար։",
      "Մշակումը, կիրառելիության դեպքում, հիմնված է պայմանագրի կատարման, մեր օրինական շահերի (ապահով և վստահելի ծառայության շահեր), իրավական պարտավորությունների կատարման և, անհրաժեշտության դեպքում, համաձայնության վրա։",
    ],
  },
  {
    title: AM_PRIVACY.sections[3]!.title,
    paragraphs: [
      "Տվյալները կիսում ենք մեր ծառայություն մատուցողների հետ (օր․ հոսթինգ, էլ․ փոստ, նվազագույն անձնական տվյալով վերլուծություն), ինչպես նաև վճարման և բանկային գործընկերների հետ՝ միայն քարտային գործարքները հաստատելու և հաշվարկելու, ինչպես նաև ֆինանսական համապատասխանության կանոնները պահպանելու համար։",
      "Տեղեկություն կարող ենք բացահայտել, եթե դա պահանջում է օրենքը, դատարանի որոշումը կամ լիազոր մարմինը, կամ Viva-ի ուսանողների, աշխատակիցների և հանրության իրավունքները, անվտանգությունը և սեփությունը պաշտպանելու համար։",
    ],
  },
  {
    title: AM_PRIVACY.sections[4]!.title,
    paragraphs: [
      "Որոշ տեխնոլոգիական մատակարարներ կարող են մշակել տվյալներ Հայաստանի Հանրապետության սահմաններից դուրս։ Նման փոխանցումների դեպքում մենք ապավինվում ենք կիրառելի օրենքով պահանջվող համապատասխան երաշխիքներին և վաճառողների պայմանագրային պարտավորություններին։",
    ],
  },
  {
    title: AM_PRIVACY.sections[5]!.title,
    paragraphs: [
      "Անձնական տվյալները պահում ենք միայն այնքան ժամանակ, որքան անհրաժեշտ է վերոնշյալ նպատակների, ներառյալ իրավական, հարկային և հաշվապահական պահպանման ժամկետների, խարդախության հսկողության և վեճերի լուծման համար։ Տվյալներն այլևս անհրաժեշտ չլինելիս ջնջում ենք կամ անանունացնում՝ մեր ներքին քաղաքականությանը համապատասխան։",
    ],
  },
  {
    title: AM_PRIVACY.sections[6]!.title,
    paragraphs: [
      "Կիրառում ենք համապատասխան տեխնիկական և կազմակերպչական միջոցներ՝ անձնական տվյալները չարտոնված մուտքից, կորստից կամ փոփոխությունից պաշտպանելու համար։ Անվտանգ փոխանցում ինտերնետով լիակատար չէ. խորհուրդ ենք տալիս օգտագործել ուժեղ գաղտնաբառեր և պաշտպանել մուտքի տվյալները։",
    ],
  },
  {
    title: AM_PRIVACY.sections[7]!.title,
    paragraphs: [
      "Օգտագործում ենք cookie-ներ և նմանատիպ տեխնոլոգիաներ, որոնք անհրաժեշտ են կայքի և սեսիայի աշխատանքի համար (օր․ նույնականացում և անվտանգություն)։ Եթե ավելացնենք ընտրովի վերլուծության կամ մարքեթինգի cookie-ներ, դրանք կնկարագրենք այստեղ և, անհրաժեշտության դեպքում, կխնդրենք համաձայնությունը դրանք տեղադրելուց առաջ։",
    ],
  },
  {
    title: AM_PRIVACY.sections[8]!.title,
    paragraphs: [
      "Հայաստանի Հանրապետության կիրառելի օրենքի շրջանակներում դուք կարող եք ունենալ իրավունք պահանջել մուտք, ուղղում, ջնջում կամ մշակման սահմանափակում, առարկել որոշ մշակումների դեմ և բողոք ներկայացնել հսկող մարմնին։ Իրավունքներն իրականացնելու համար կապվեք մեզ հետ՝ Կապ էջում նշված տվյալներով։",
    ],
  },
  {
    title: AM_PRIVACY.sections[9]!.title,
    paragraphs: [
        "Մեր ծառայությունները նախատեսված են այն օգտատերերի համար, ովքեր կարող են օրինական կերպով վարորդական ուսուցման պայմանագրեր կնքել։ Եթե կարծում եք, որ մենք մշակել ենք երեխայի անձնական տվյալներ առանց համապատասխան լիազորության, կապվեք մեզ հետ, և մենք կձեռնարկենք համապատասխան քայլեր։",
    ],
  },
  {
    title: AM_PRIVACY.sections[10]!.title,
    paragraphs: [
      "Կարող ենք թարմացնել այս քաղաքականությունը ժամանակ առ ժամանակ։ Վերևի «Վերջին թարմացում» ամսաթիվը կփոխվի։ Էական փոփոխությունները կարող ենք հայտարարել կայքով կամ, անհրաժեշտության դեպքում, էլ․ փոստով։",
    ],
  },
];

/** Russian body text aligned with EN (not machine-translated headings-only). */
RU_PRIVACY.sections = [
  {
    title: RU_PRIVACY.sections[0]!.title,
    paragraphs: [
      "Автошкола Viva управляет этим сайтом и связанными с ним онлайн‑сервисами для учеников. Коммерческое наименование, юридический адрес, телефон и адрес электронной почты в подвале сайта и на странице «Контакты» определяют контролёра персональных данных в соответствии с настоящей политикой.",
    ],
  },
  {
    title: RU_PRIVACY.sections[1]!.title,
    paragraphs: [
      "В зависимости от использования сервисов мы можем обрабатывать: имя; контактные данные (телефон, email); данные для входа; сведения о записях и занятиях; сообщения, которые вы нам отправляете; технические данные (IP‑адрес, тип браузера, идентификаторы устройств, журналы безопасности); а также метаданные платежей (сумма, валюта, статус операции, время).",
      "При оплате картой в интернете номер карты и код безопасности вводятся только на защищённой странице оплаты, которую предоставляют наш эквайерский банк и его партнёры по обработке карт. Мы не храним на своих серверах полные номера карт и коды безопасности.",
    ],
  },
  {
    title: RU_PRIVACY.sections[2]!.title,
    paragraphs: [
      "Мы используем данные для оказания услуг автошколы, ведения учётных записей и записей, связи с вами, обработки платежей совместно с банком, выполнения бухгалтерских и регуляторных обязанностей, предотвращения мошенничества и злоупотреблений, улучшения и защиты систем, а также для применения наших условий.",
      "Обработка осуществляется, где применимо, на основании исполнения договора с вами, законных интересов (безопасная и надёжная работа сервиса), выполнения юридических обязательств и согласия, если оно требуется законом.",
    ],
  },
  {
    title: RU_PRIVACY.sections[3]!.title,
    paragraphs: [
      "Мы передаём данные поставщикам услуг, которые помогают нам (например, хостинг, доставка почты, аналитика с минимизацией персональных данных), а также платёжным и банковским партнёрам в объёме, необходимом для авторизации и клиринга операций по картам и для соблюдения финансовых требований.",
      "Мы можем раскрыть информацию, если этого требуют закон, суд или уполномоченный орган, а также для защиты прав, безопасности и имущества учеников, персонала и общественности.",
    ],
  },
  {
    title: RU_PRIVACY.sections[4]!.title,
    paragraphs: [
      "Некоторые поставщики технологий могут обрабатывать данные за пределами Республики Армения. В таких случаях мы опираемся на надлежащие гарантии, предусмотренные применимым правом, и на договорные обязательства поставщиков.",
    ],
  },
  {
    title: RU_PRIVACY.sections[5]!.title,
    paragraphs: [
      "Мы храним персональные данные только столько, сколько необходимо для указанных целей, включая сроки хранения по закону, налогам и учёту, мониторинг мошенничества и разрешение споров. Когда данные больше не нужны, мы удаляем или обезличиваем их в соответствии с внутренними правилами.",
    ],
  },
  {
    title: RU_PRIVACY.sections[6]!.title,
    paragraphs: [
      "Мы применяем соответствующие технические и организационные меры для защиты персональных данных от несанкционированного доступа, утраты или изменения. Передача данных через Интернет не может быть абсолютно безопасной; используйте надёжные пароли и берегите учётные данные.",
    ],
  },
  {
    title: RU_PRIVACY.sections[7]!.title,
    paragraphs: [
      "Мы используем cookie и аналогичные технологии, строго необходимые для работы сайта и сессии (например, аутентификация и безопасность). Если мы добавим необязательные аналитические или маркетинговые cookie, мы опишем их здесь и, при необходимости, запросим согласие до их установки.",
    ],
  },
  {
    title: RU_PRIVACY.sections[8]!.title,
    paragraphs: [
      "В соответствии с применимым правом Республики Армения вы можете иметь право на доступ, исправление, удаление или ограничение обработки, на возражение против отдельных видов обработки и на подачу жалобы в надзорный орган. Для реализации прав свяжитесь с нами через контакты на странице «Контакты».",
    ],
  },
  {
    title: RU_PRIVACY.sections[9]!.title,
    paragraphs: [
      "Наши сервисы предназначены для пользователей, которые могут законно заключать договоры на обучение вождению. Если вы считаете, что мы обработали персональные данные ребёнка без должных полномочий, сообщите нам — мы примем соответствующие меры.",
    ],
  },
  {
    title: RU_PRIVACY.sections[10]!.title,
    paragraphs: [
      "Мы можем периодически обновлять эту политику. Дата «Последнее обновление» вверху будет меняться. О существенных изменениях мы можем сообщить на сайте или по электронной почте, где это уместно.",
    ],
  },
];

RU_TERMS.sections = [
  {
    title: RU_TERMS.sections[0]!.title,
    paragraphs: [
      "Получая доступ к сайту, создавая учётную запись, записываясь на занятия или приобретая пакеты, вы соглашаетесь с настоящими Условиями обслуживания и с Политикой конфиденциальности. Если вы не согласны, не используйте наши сервисы.",
    ],
  },
  {
    title: RU_TERMS.sections[1]!.title,
    paragraphs: [
      "Viva предоставляет обучение вождению и связанные образовательные услуги, как описано на сайте. Конкретное время и место занятий, автомобили, инструкторы и состав пакетов могут зависеть от филиала и наличия. Мы можем обновлять описания услуг и расписание в операционных целях.",
    ],
  },
  {
    title: RU_TERMS.sections[2]!.title,
    paragraphs: [
      "Вы несёте ответственность за достоверность предоставленных данных и за сохранность учётных данных. Немедленно сообщите нам о любом несанкционированном использовании вашей учётной записи.",
    ],
  },
  {
    title: RU_TERMS.sections[3]!.title,
    paragraphs: [
      "Запись подтверждается с учётом доступности инструкторов и правил филиала, указанных в момент бронирования. Поздняя отмена или неявка могут повлечь сборы или потерю предоплаченных занятий, как указано в процессе записи или в правилах филиала.",
    ],
  },
  {
    title: RU_TERMS.sections[4]!.title,
    paragraphs: [
      "Цены указаны в армянских драмах, если не сказано иное. Применимые налоги и сборы будут показаны перед оплатой, если это требуется законом.",
    ],
  },
  {
    title: RU_TERMS.sections[5]!.title,
    paragraphs: [
      "Вы обязуетесь не злоупотреблять сайтом или личными кабинетами (например, не пытаться получить несанкционированный доступ, не мешать другим пользователям, не распространять вредоносное ПО). Мы можем приостановить или прекратить доступ при нарушениях.",
    ],
  },
  {
    title: RU_TERMS.sections[6]!.title,
    paragraphs: [
      "Контент сайта (тексты, графика, логотипы и учебные материалы, доступные через сервисы) принадлежит Viva или правообладателям. Копирование и распространение без разрешения запрещены, кроме случаев, прямо разрешённых законом.",
    ],
  },
  {
    title: RU_TERMS.sections[7]!.title,
    paragraphs: [
      "В максимальной степени, разрешённой применимым правом Республики Армения, мы не несём ответственности за косвенный или последующий ущерб, связанный с использованием сайта или сервисов. Ничто в этих условиях не исключает ответственность, которую нельзя исключить по закону.",
    ],
  },
  {
    title: RU_TERMS.sections[8]!.title,
    paragraphs: [
      "Эти условия регулируются законодательством Республики Армения. Споры подлежат рассмотрению в судах Армении без ущерба для императивных прав потребителей, где это применимо.",
    ],
  },
  {
    title: RU_TERMS.sections[9]!.title,
    paragraphs: [
      "По вопросам этих условий используйте контактные данные на странице «Контакты» и в подвале сайта.",
    ],
  },
];

RU_PAYMENTS.sections = [
  {
    title: RU_PAYMENTS.sections[0]!.title,
    paragraphs: [
      "Платежи по банковским картам за наши услуги обрабатываются в рамках эквайерских отношений с ACBA Bank CJSC («ACBA Bank») с использованием стандартного интернет‑эквайинга для э‑коммерции. Поддерживаемые бренды карт и программы определяются ACBA Bank и соответствующими платёжными системами (например ArCa, Visa, Mastercard и American Express, если предлагается).",
    ],
  },
  {
    title: RU_PAYMENTS.sections[1]!.title,
    paragraphs: [
      "Для онлайн‑оплаты картой применяется аутентификация 3‑D Secure, когда это требуется эмитентом и платёжной системой (Verified by Visa, Mastercard SecureCode, American Express SafeKey, ArCa SecurePay и т.п.). Вам может потребоваться пройти шаг аутентификации в банке‑эмитенте до подтверждения платежа.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[2]!.title,
    paragraphs: [
      "Данные держателя карты вводятся только на защищённом платёжном интерфейсе банка и процессингового центра, а не в полях, управляемых автошколой Viva. Это снижает риск обработки чувствительных данных на нашей стороне и соответствует ожиданиям для интернет‑эквайинга.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[3]!.title,
    paragraphs: [
      "Мы можем хранить в своих системах ссылки на транзакции, суммы, время и статус оплаты для учёта, поддержки клиентов и разрешения споров. Мы не храним на своих серверах полные основные номера счёта (PAN), треки магнитной полосы или коды безопасности карты.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[4]!.title,
    paragraphs: [
      "Бронирование или покупка подтверждаются только после успешной авторизации или подтверждения клиринга от платёжной платформы, с учётом наших внутренних проверок на мошенничество и политики. При неуспешной оплате или отмене операции связанные услуги могут быть аннулированы или приостановлены.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[5]!.title,
    paragraphs: [
      "Возвраты, где применимо, выполняются в соответствии с законодательством Армении о защите прав потребителей, правилами платёжных систем и нашей публикованной политикой отмены для приобретённого продукта. Возврат производится на исходный способ оплаты, если это технически возможно, либо иным согласованным способом.",
      "Сроки зачисления могут зависеть от ACBA Bank, платёжных сетей и банка‑эмитента.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[6]!.title,
    paragraphs: [
      "При инициировании чарджбэка мы предоставляем эквайеру подтверждающие материалы в рамках, разрешённом законом и правилами схем. По вопросам списаний сначала свяжитесь с нами через страницу «Контакты», чтобы решить вопрос до спора, где это возможно.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[7]!.title,
    paragraphs: [
      "Мы выдаём квитанции или налоговые документы в соответствии с применимым законом и внутренними процедурами. Сохраняйте письмо‑подтверждение или квитанцию после успешной оплаты.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[8]!.title,
    paragraphs: [
      "Если ACBA Bank или платёжные системы предоставляют знаки программ безопасности (например 3‑D Secure или знаки приёма карт), мы можем размещать их на платёжном пути или в подвале сайта в порядке, разрешённом банком, чтобы покупатели могли распознать легитимный приём платежей.",
    ],
  },
  {
    title: RU_PAYMENTS.sections[9]!.title,
    paragraphs: [
      "Мы можем обновлять эту страницу при изменении тарифов, банковской интеграции или требований закона. Дата «Последнее обновление» отражает последнюю редакцию.",
    ],
  },
];

AM_TERMS.sections = [
  {
    title: AM_TERMS.sections[0]!.title,
    paragraphs: [
      "Կայք մուտք գործելով, հաշիվ ստեղծելով, դասեր ամրագրելով կամ փաթեթներ գնելով՝ դուք համաձայնում եք այս Ծառայությունների պայմաններին և Գաղտնիության քաղաքականությանը։ Եթե չեք համաձայնում, չօգտագործեք մեր ծառայությունները։",
    ],
  },
  {
    title: AM_TERMS.sections[1]!.title,
    paragraphs: [
      "Viva-ն մատուցում է վարորդական ուսուցում և կից կրթական ծառայություններ՝ ինչպես նկարագրված է կայքում։ Դասերի ժամանակը, վայրը, մեքենաները, դասավանդողները և փաթեթների բովանդակությունը կարող են տարբերվել մասնաճյուղի և հասանելիության համաձայն։ Կարող ենք թարմացնել ծառայությունների նկարագրությունները և ժամանակացույցը գործառնական անհրաժեշտությունից ելնելով։",
    ],
  },
  {
    title: AM_TERMS.sections[2]!.title,
    paragraphs: [
      "Դուք պատասխանատու եք տրամադրած տեղեկությունների ճշգրտության և մուտքի տվյալների գաղտնիության համար։ Անհապաղ տեղեկացրեք մեզ ձեր հաշվի չարտոնված օգտագործման մասին։",
    ],
  },
  {
    title: AM_TERMS.sections[3]!.title,
    paragraphs: [
      "Ամրագրումները հաստատվում են՝ հաշվի առնելով դասավանդողների հասանելիությունը և մասնաճյուղի կանոնները, որոնք ցուցադրվում են ամրագրման պահին։ Ուշ չեղարկումը կամ բացակայությունը կարող են ենթակա լինել վճարների կամ նախավճարով դասերի կորստի՝ ինչպես նշված է ամրագրման հոսքում կամ մասնաճյուղի քաղաքականությունում։",
    ],
  },
  {
    title: AM_TERMS.sections[4]!.title,
    paragraphs: [
      "Գները ցուցադրվում են հայկական դրամով, եթե այլ բան նշված չէ։ Կիրառելի հարկերը և վճարները կներկայացվեն վճարմանից առաջ, եթե դա պահանջվում է օրենքով։",
    ],
  },
  {
    title: AM_TERMS.sections[5]!.title,
    paragraphs: [
      "Պարտավորվում եք չչարաշահել կայքը կամ պորտալները (օր․ չթույլատրված մուտքի փորձ, այլ օգտատերերի խանգարում, վնասակար ծրագրերի տարածում)։ Կարող ենք կասեցնել կամ դադարեցնել մուտքը խախտումների դեպքում։",
    ],
  },
  {
    title: AM_TERMS.sections[6]!.title,
    paragraphs: [
      "Կայքի բովանդակությունը (տեքստեր, գրաֆիկա, լոգոներ և մեր ծառայություններով հասանելի ուսումնական նյութեր) պատկանում է Viva-ին կամ լիցենզիարներին։ Չեք կարող պատճենել կամ տարածել առանց թույլտվության, բացառությամբ օրենքով թույլատրված դեպքերի։",
    ],
  },
  {
    title: AM_TERMS.sections[7]!.title,
    paragraphs: [
      "Հայաստանի Հանրապետության կիրառելի օրենքով թույլատրված առավելագույն չափով մենք պատասխանատու չենք կայքի կամ ծառայությունների օգտագործումից բխող անուղղակի կամ հետևանքային վնասների համար։ Այս պայմաններում ոչինչ չի բացառում պատասխանատվությունը, որը օրենքով հնարավոր չէ բացառել։",
    ],
  },
  {
    title: AM_TERMS.sections[8]!.title,
    paragraphs: [
      "Այս պայմանները կարգավորվում են Հայաստանի Հանրապետության օրենքներով։ Վեճերը ենթակա են Հայաստանի դատարանների դատարանական վարույթին՝ առանց սպառնալիքի սպառողի պարտադիր իրավունքների համար, որտեղ դա կիրառելի է։",
    ],
  },
  {
    title: AM_TERMS.sections[9]!.title,
    paragraphs: [
      "Այս պայմանների վերաբերյալ հարցերի դեպքում օգտագործեք Կապ էջում և կայքի վերջնագրում հրապարակված կոնտակտները։",
    ],
  },
];

AM_PAYMENTS.sections = [
  {
    title: AM_PAYMENTS.sections[0]!.title,
    paragraphs: [
      "Մեր ծառայությունների համար քարտային վճարումները մշակվում են ACBA Բանկ ՓԲԸ («ACBA Բանկ») հետ մեր էքվայերական հարաբերությունների շրջանակներում՝ էլեկտրոնային առևտրի համար ընդունված ինտերնետային էքվայերինգի ստանդարտներով։ Աջակցվող քարտային ապրանքանիշերը և ծրագրերը որոշվում են ACBA Բանկի և համապատասխան քարտային համակարգերի կողմից (օր․ ArCa, Visa, Mastercard և American Express, եթե առաջարկվում է)։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[1]!.title,
    paragraphs: [
      "Առցանց քարտային վճարումների համար կիրառվում է 3-D Secure նույնականացում, երբ դա պահանջում են թողարկող բանկը և քարտային համակարգը (Verified by Visa, Mastercard SecureCode, American Express SafeKey, ArCa SecurePay և այլն)։ Վճարումը հաստատելուց առաջ կարող եք ուղղորդվել ձեր բանկի նույնականացման քայլին։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[2]!.title,
    paragraphs: [
      "Քարտապանի տվյալները մուտքագրվում են միայն բանկի և վճարների մշակման կենտրոնի ապահով վճարման միջերեսում, ոչ թե Viva ավտոդպրոցի կողմից կառավարվող դաշտերում։ Սա նվազեցնում է զգայուն տվյալների մշակման ռիսկը մեր կողմից և համապատասխանում է ինտերնետային քարտային ընդունման սպասումներին։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[3]!.title,
    paragraphs: [
      "Մեր համակարգերում կարող ենք պահել վճարման գործարքների հղումներ, գումարներ, ժամանակագրություններ և վճարման կարգավիճակ՝ հաշվապահության, հաճախորդների աջակցության և վեճերի լուծման համար։ Մեր սերվերներում չենք պահում ամբողջական հիմնական հաշվեհամարներ (PAN), մագնիսական ժապավենի ամբողջական տվյալներ կամ քարտի անվտանգության կոդեր։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[4]!.title,
    paragraphs: [
      "Ամրագրումը կամ գնումը հաստատվում է միայն այն բանից հետո, երբ ստանանք վճարային հարթակից հաջող թույլտվություն կամ հաշվարկի հաստատում՝ հաշվի առնելով ներքին խարդախության և քաղաքականության ստուգումները։ Վճարումը ձախողվելու կամ հետ կանչվելու դեպքում կապված ծառայությունները կարող են չեղարկվել կամ կասեցվել։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[5]!.title,
    paragraphs: [
      "Վերադարձները, որտեղ դա կիրառելի է, կատարվում են Հայաստանի սպառողների իրավունքների պաշտպանության օրենքի, քարտային համակարգերի կանոնների և ձեր գնած արտադրանքի համար հրապարակված չեղարկման քաղաքականության համաձայն։ Վերադարձները կրեդիտավորվում են սկզբնական վճարման եղանակին, եթե տեխնիկապես հնարավոր է, կամ այլ սահմանված միջոցով՝ ձեզ հետ համաձայնեցված։",
      "Մշակման ժամկետները կարող են կախված լինել ACBA Բանկից, քարտային ցանցերից և ձեր թողարկող բանկից։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[6]!.title,
    paragraphs: [
      "Եթե նախաձեռնեք չարջբեք, ապացույց ներկայացնելու ենք էքվայերին՝ օրենքով և համակարգի կանոններով թույլատրված շրջանակում։ Վճարային հարցերով նախ կապվեք մեզ հետ՝ Կապ էջի միջոցով, որպեսզի կարողանանք լուծել հարցը մինչև վեզի բացում, որտեղ հնարավոր է։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[7]!.title,
    paragraphs: [
      "Կտրոններ կամ հարկային փաստաթղթեր ենք տրամադրում՝ համաձայն կիրառելի օրենքի և մեր ներքին ընթացակարգերի։ Պահպանեք հաջող վճարումից հետո ստացված հաստատման էլ․ նամակը կամ կտրոնը։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[8]!.title,
    paragraphs: [
      "Երբ ACBA Բանկը կամ քարտային համակարգերը տրամադրում են անվտանգության ծրագրի նշաններ (օր․ 3-D Secure կամ քարտերի ընդունման լոգոներ), կարող ենք դրանք ցուցադրել վճարման ուղին կամ վերջնագիր՝ բանկի թույլտվությամբ, որպեսզի քարտապանները ճանաչեն լեգիտիմ վճարումների ընդունումը։",
    ],
  },
  {
    title: AM_PAYMENTS.sections[9]!.title,
    paragraphs: [
      "Կարող ենք թարմացնել այս էջը՝ սակագ, բանկային ինտեգրում կամ իրավական պահանջներ փոխվելիս։ «Վերջին թարմացում» ամսաթիվը արտահայտում է վերջին խմբագրումը։",
    ],
  },
];

export const LEGAL_DOCS = {
  privacy: { en: EN_PRIVACY, ru: RU_PRIVACY, am: AM_PRIVACY },
  terms: { en: EN_TERMS, ru: RU_TERMS, am: AM_TERMS },
  payments: { en: EN_PAYMENTS, ru: RU_PAYMENTS, am: AM_PAYMENTS },
} as const;

export function legalDoc<K extends keyof typeof LEGAL_DOCS>(kind: K, lang: Lang): (typeof LEGAL_DOCS)[K][Lang] {
  return LEGAL_DOCS[kind][lang];
}
