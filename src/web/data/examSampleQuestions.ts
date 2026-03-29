import type { Lang } from "@/lib/i18n";

export type ExamQuestionCategory = "rules" | "signs" | "safety";

export interface ExamQuestion {
  readonly id: string;
  readonly text: Record<Lang, string>;
  readonly options: Record<Lang, readonly string[]>;
  readonly correctIndex: number;
  readonly category: ExamQuestionCategory;
}

/** Localized copy for the active UI language (same correctIndex across languages). */
export function getQuestionInLang(q: ExamQuestion, lang: Lang): { text: string; options: string[] } {
  return {
    text: q.text[lang],
    options: [...q.options[lang]],
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
    correctIndex: 1,
    category: "rules",
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
    correctIndex: 1,
    category: "rules",
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
    correctIndex: 1,
    category: "safety",
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
    correctIndex: 1,
    category: "safety",
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
    correctIndex: 1,
    category: "rules",
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
    correctIndex: 1,
    category: "signs",
  },
];

export type ExamQuizMode = "full" | "topics" | "signs";

export function selectQuestionsForMode(mode: ExamQuizMode, pool: readonly ExamQuestion[] = EXAM_QUESTION_POOL): ExamQuestion[] {
  let filtered: ExamQuestion[];
  if (mode === "signs") {
    filtered = pool.filter((q) => q.category === "signs");
  } else if (mode === "topics") {
    filtered = pool.filter((q) => q.category === "rules" || q.category === "safety");
  } else {
    filtered = [...pool];
  }
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const take = mode === "full" ? Math.min(5, shuffled.length) : Math.min(4, shuffled.length);
  return shuffled.slice(0, take);
}
