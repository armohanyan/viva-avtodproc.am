import type { Lang } from "src/lib/i18n";

export type ExamQuestionCategory = "rules" | "signs" | "safety";

export interface ExamQuestion {
  readonly id: string;
  readonly text: Record<Lang, string>;
  readonly options: Record<Lang, readonly string[]>;
  readonly optionExplanations?: Record<Lang, readonly (string | null)[]>;
  readonly explanation?: string;
  readonly correctIndex: number;
  readonly category: ExamQuestionCategory;
  /** Thematic chapter id (`?topic=`). Thematic UI uses 11 cards (ids include `11` for markings; `5` is color perception, last in the list). Omit for exam-only questions. */
  readonly topicId?: string;
  /** Optional illustration (HTTPS URL or data URL), same for all languages. */
  readonly imageUrl?: string | null;
}

/** Localized copy for the active UI language (same correctIndex across languages). */
export function getQuestionInLang(q: ExamQuestion, lang: Lang): { text: string; options: string[]; explanation?: string } {
  const fallbackExplanation = q.optionExplanations?.[lang]?.[q.correctIndex] ?? undefined;
  return {
    text: q.text[lang],
    options: [...q.options[lang]],
    explanation: q.explanation ?? (fallbackExplanation ?? undefined),
  };
}

/** Sample pool — extend or replace with API-backed questions later. */
export const EXAM_QUESTION_POOL: readonly ExamQuestion[] = [
  {
    id: "r1",
    text: {
      en: "At an intersection with no signs, who yields when two vehicles approach from perpendicular directions?",
      ru: "На перекрёстке без знаков при взаимно перпендикулярном движении кто уступает дорогу?",
      am: "Առանց նշանների խաչմերուկում, երբ երկու մեքենա մոտենում են ուղղահայաց ուղություններից, ո՞վ պետք է զիջի ճանապարհը։",
    },
    options: {
      en: ["The vehicle on the wider road", "The vehicle approaching from the right", "The faster vehicle", "The larger vehicle"],
      ru: ["Транспортное средство на более широкой дороге", "Транспортное средство, приближающееся справа", "Более быстрое транспортное средство", "Более крупное транспортное средство"],
      am: ["Ավելի լայն ճանապարհի վրա գտնվող մեքենան", "Աջից մոտենացող մեքենան", "Ավելի արագ մեքենան", "Ավելի մեծ մեքենան"],
    },
    optionExplanations: {
      en: [null, "At uncontrolled intersections, priority is usually given to vehicles approaching from the right.", null, null],
      ru: [null, "На нерегулируемых перекрёстках обычно действует правило «помехи справа».", null, null],
      am: [null, "Չկարգավորվող խաչմերուկներում սովորաբար գործում է «աջից եկողին զիջելու» կանոնը։", null, null],
    },
    correctIndex: 1,
    category: "rules",
    topicId: "5",
  },
  {
    id: "r2",
    text: {
      en: "What is the typical meaning of a triangular sign with a red border?",
      ru: "Что обычно означает треугольный дорожный знак с красной окантовкой?",
      am: "Ինչ է սովորաբար նշանակում կարմիր եզրով եռանկյուն ճանապարհային նշանը։",
    },
    options: {
      en: ["End of restriction", "Warning / give way context", "Mandatory direction", "No stopping"],
      ru: ["Конец ограничения", "Предупреждение / уступить дорогу", "Обязательное направление", "Остановка запрещена"],
      am: ["Սահմանափակման վերջ", "Զգուշացում / զիջել ճանապարհը", "Պարտադիր ուղղություն", "Կանգ առնելն արգելված է"],
    },
    optionExplanations: {
      en: [
        null,
        "Triangular red-bordered signs are warning signs; many indicate hazards or yield-related priority rules.",
        null,
        null,
      ],
      ru: [
        null,
        "Треугольные знаки с красной окантовкой относятся к предупреждающим; часто сообщают об опасности или приоритете.",
        null,
        null,
      ],
      am: [
        null,
        "Կարմիր եզրով եռանկյուն նշանները զգուշացնող են․ հաճախ տեղեկացնում են վտանգի կամ երթևեկության առաջնահերթության մասին։",
        null,
        null,
      ],
    },
    correctIndex: 1,
    category: "rules",
    topicId: "5",
  },
  {
    id: "s1",
    text: {
      en: "A circular sign with a red border and white background showing \"40\" means:",
      ru: "Круглый знак с красной окантовкой и белым фоном с цифрой «40» означает:",
      am: "Կարմիր եզրով, սպիտակ ֆոնով կլոր նշանը «40» թվով նշանակում է՝",
    },
    options: {
      en: ["Minimum speed 40 km/h", "Maximum speed 40 km/h", "Advisory speed only", "End of 40 km/h zone"],
      ru: ["Минимальная скорость 40 км/ч", "Максимальная скорость 40 км/ч", "Рекомендуемая скорость", "Конец зоны 40 км/ч"],
      am: ["Նվազագույն արագություն 40 կմ/ժ", "Առավելագույն արագություն 40 կմ/ժ", "Խորհուրդ տրվող արագություն", "40 կմ/ժ գոտու վերջ"],
    },
    optionExplanations: {
      en: [null, "A red-bordered speed sign with a number sets the maximum permitted speed.", null, null],
      ru: [null, "Круглый знак с красной окантовкой и числом указывает максимально допустимую скорость.", null, null],
      am: [null, "Կարմիր եզրով արագության նշանը սահմանում է առավելագույն թույլատրելի արագությունը։", null, null],
    },
    correctIndex: 1,
    category: "signs",
  },
  {
    id: "s2",
    text: {
      en: "A blue circular sign with a white arrow usually indicates:",
      ru: "Синий круглый знак с белой стрелкой обычно означает:",
      am: "Սպիտակ սլաքով կապույտ կլոր նշանը սովորաբար նշանակում է՝",
    },
    options: {
      en: ["No entry", "Mandatory direction", "End of lane", "Hospital ahead"],
      ru: ["Въезд запрещён", "Обязательное направление движения", "Конец полосы", "Больница впереди"],
      am: ["Մուտքն արգելված է", "Պարտադիր ուղղություն", "Գոտու վերջ", "Հիվանդանոց՝ առաջ"],
    },
    optionExplanations: {
      en: [null, "Blue circular signs generally indicate mandatory instructions.", null, null],
      ru: [null, "Синие круглые знаки обычно обозначают обязательные предписания.", null, null],
      am: [null, "Կապույտ կլոր նշանները սովորաբար նշանակում են պարտադիր հրահանգներ։", null, null],
    },
    correctIndex: 1,
    category: "signs",
  },
  {
    id: "sf1",
    text: {
      en: "In heavy rain, you should primarily:",
      ru: "При сильном дожде в первую очередь следует:",
      am: "Ուժեղ անձրևի ժամանակ հիմնականում պետք է՝",
    },
    options: {
      en: ["Use hazard lights instead of headlights", "Increase following distance and reduce speed", "Drive closer to the vehicle ahead for visibility", "Use high beam at all times"],
      ru: ["Включить аварийку вместо фар", "Увеличить дистанцию и снизить скорость", "Ехать ближе к впереди идущему для обзора", "Постоянно использовать дальний свет"],
      am: ["Փոխարինել լուսարձակները վթարային լույսերով", "Մեծացնել հեռավորությունը և նվազեցնել արագությունը", "Մոտենալ առջևի մեքենային տեսանելիության համար", "Միշտ միացնել երկար լույսը"],
    },
    optionExplanations: {
      en: [null, "In rain, tire grip and visibility are reduced; lower speed and larger gap improve safety.", null, null],
      ru: [null, "Во время дождя сцепление и обзор хуже, поэтому нужно снизить скорость и увеличить дистанцию.", null, null],
      am: [null, "Անձրևի ժամանակ կպչունությունն ու տեսանելիությունը նվազում են, ուստի պետք է դանդաղել և մեծացնել հեռավորությունը։", null, null],
    },
    correctIndex: 1,
    category: "safety",
    topicId: "5",
  },
  {
    id: "sf2",
    text: {
      en: "Before changing lanes on a multi-lane road, you must:",
      ru: "Перед перестроением на многополосной дороге необходимо:",
      am: "Բազմագոտի ճանապարհում գոտի փոխելուց առաջ պետք է՝",
    },
    options: {
      en: ["Signal for at least 5 seconds then move", "Check mirrors and blind spot, signal, then move when safe", "Move first, then signal", "Sound the horn twice"],
      ru: ["Включить поворотник минимум на 5 секунд и перестроиться", "Проверить зеркала и «слепую» зону, подать сигнал и перестроиться при безопасности", "Сначала перестроиться, потом сигнализировать", "Дважды подать звуковой сигнал"],
      am: ["Նվազագույն 5 վայրկյան ազդանշան տալ, հետո շարժվել", "Ստուգել հայելիներն ու «կույր» գոտին, ազդանշան տալ, անվտանգ լինելու դեպքում շարժվել", "Նախ շարժվել, հետո ազդանշան տալ", "Երկու անգամ հնչեցնել ձայնային ազդանշան"],
    },
    optionExplanations: {
      en: [null, "A safe lane change sequence is observe, signal, then maneuver only when the lane is clear.", null, null],
      ru: [null, "Безопасное перестроение: оценка обстановки, сигнал и только затем манёвр при свободной полосе.", null, null],
      am: [null, "Անվտանգ գոտի փոխելը՝ դիտում, ազդանշան և միայն հետո մանևր՝ երբ գոտին ազատ է։", null, null],
    },
    correctIndex: 1,
    category: "safety",
    topicId: "5",
  },
  {
    id: "r3",
    text: {
      en: "Stopping or parking is generally prohibited:",
      ru: "Остановка или стоянка как правило запрещены:",
      am: "Կանգ առնելը կամ կայանելը սովորաբար արգելված է՝",
    },
    options: {
      en: ["Only on highways", "On pedestrian crossings and close to them", "In residential areas", "Near any blue sign"],
      ru: ["Только на автомагистралях", "На пешеходных переходах и вблизи них", "В жилых зонах", "У любого синего знака"],
      am: ["Միայն արագաչափ ճանապարհներում", "Հետիոտնային անցումների վրա և դրանց մոտ", "Բնակելի գոտիներում", "Ցանկացած կապույտ նշանի մոտ"],
    },
    optionExplanations: {
      en: [null, "Stopping near pedestrian crossings blocks visibility and is prohibited for safety reasons.", null, null],
      ru: [null, "Остановка у пешеходных переходов ограничивает обзор и запрещена по соображениям безопасности.", null, null],
      am: [null, "Հետիոտնային անցումների մոտ կանգառը սահմանափակում է տեսանելիությունը և արգելված է անվտանգության համար։", null, null],
    },
    correctIndex: 1,
    category: "rules",
    topicId: "5",
  },
  {
    id: "s3",
    text: {
      en: "An octagonal red sign means:",
      ru: "Восьмиугольный красный знак означает:",
      am: "Ութանկյուն կարմիր նշանը նշանակում է՝",
    },
    options: {
      en: ["Yield", "Stop completely", "No entry", "Give way to pedestrians only"],
      ru: ["Уступить дорогу", "Полная остановка", "Въезд запрещён", "Уступить только пешеходам"],
      am: ["Զիջել ճանապարհը", "Լրիվ կանգ", "Մուտքն արգելված է", "Զիջել միայն հետիոտներին"],
    },
    optionExplanations: {
      en: [null, "The octagonal red sign is the STOP sign and requires a complete stop.", null, null],
      ru: [null, "Восьмиугольный красный знак — это STOP, он требует полной остановки.", null, null],
      am: [null, "Ութանկյուն կարմիր նշանը STOP-ն է և պահանջում է լիարժեք կանգառ։", null, null],
    },
    correctIndex: 1,
    category: "signs",
  },
];

export type ExamQuizMode = "full" | "topics" | "signs";

export type SelectExamQuestionsOpts = {
  /** When set (thematic URL with `?topic=`), keep only rules/safety questions with this `topicId`. */
  thematicTopicId?: string | null;
  /** When set (exam URL with `?ticket=`), use these question ids in order from the pool (e.g. one official exam card). */
  fixedQuestionIds?: string[] | null;
};

export function selectQuestionsForMode(
  mode: ExamQuizMode,
  pool: readonly ExamQuestion[] = EXAM_QUESTION_POOL,
  opts?: SelectExamQuestionsOpts,
): ExamQuestion[] {
  if (opts?.fixedQuestionIds != null) {
    const fixedIds = opts.fixedQuestionIds.filter((id) => typeof id === "string" && id.trim());
    if (fixedIds.length === 0) return [];
    const byId = new Map(pool.map((q) => [q.id, q]));
    return fixedIds.map((id) => byId.get(id.trim())).filter((q): q is ExamQuestion => Boolean(q));
  }

  const thematicTopicId = opts?.thematicTopicId?.trim();
  let filtered: ExamQuestion[];
  if (mode === "signs") {
    filtered = pool.filter((q) => q.category === "signs");
  } else if (mode === "topics") {
    // Sign-category packs are pre-filtered by the API (`category: "signs"`).
    const signCategoryPack = pool.length > 0 && pool.every((q) => q.category === "signs");
    if (signCategoryPack) {
      filtered = [...pool];
    } else {
      filtered = pool.filter((q) => q.category === "rules" || q.category === "safety");
      if (thematicTopicId) {
        filtered = filtered.filter((q) => q.topicId === thematicTopicId);
      }
    }
  } else {
    filtered = [...pool];
  }
  if (mode === "topics") {
    // Keep server-provided topic order stable to avoid reshuffling on every open.
    return [...filtered];
  }

  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const take = mode === "full" ? Math.min(5, shuffled.length) : Math.min(4, shuffled.length);
  return shuffled.slice(0, take);
}

