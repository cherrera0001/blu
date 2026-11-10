export const LOCALES = ["es", "en-US", "zh-CN"] as const;
export type Locale = (typeof LOCALES)[number];

const LOCALE_KEY = "blu.locale.v1";

/**
 * Castellano es el texto fuente. `translate` devuelve ese texto en `es`
 * y la versión en inglés (EE. UU.) o chino mandarín simplificado en los otros.
 * Si falta una entrada, se conserva el castellano: nunca se inventa una frase.
 */
const DICTIONARY: Record<string, Record<Exclude<Locale, "es">, string>> = {
  Idioma: { "en-US": "Language", "zh-CN": "语言" },
  "Versión de prueba": { "en-US": "Trial version", "zh-CN": "试用版" },
  "TU BIENESTAR, UN DÍA A LA VEZ": {
    "en-US": "YOUR WELLBEING, ONE DAY AT A TIME",
    "zh-CN": "你的身心状态，一天一步",
  },
  "Un cambio pequeño también cuenta.": {
    "en-US": "A small change counts too.",
    "zh-CN": "小小的改变也算数。",
  },
  "Elige algo que te gustaría explorar. No necesitas cambiarlo todo hoy ni hacerlo perfecto.": {
    "en-US": "Choose something you would like to explore. You do not need to change everything today or do it perfectly.",
    "zh-CN": "选一件你想试试的事。不必今天改掉一切，也不必做到完美。",
  },
  "Blu es un prototipo de bienestar, no una herramienta clínica. No ofrece consejos médicos ni promete vivir más años.": {
    "en-US": "Blu is a wellbeing prototype, not a clinical tool. It does not give medical advice or promise more years of life.",
    "zh-CN": "Blu 是一个身心状态原型，不是临床工具。它不提供医疗建议，也不承诺延年益寿。",
  },
  "PRIMER PASO": { "en-US": "FIRST STEP", "zh-CN": "第一步" },
  "AJUSTA TU SELECCIÓN": { "en-US": "ADJUST YOUR SELECTION", "zh-CN": "调整你的选择" },
  "¿Qué te gustaría cuidar?": { "en-US": "What would you like to care for?", "zh-CN": "你想照顾哪一块？" },
  "Elige entre uno y cuatro temas. Tú decides el ritmo.": {
    "en-US": "Choose one to four themes. You set the pace.",
    "zh-CN": "选一到四个主题。节奏由你决定。",
  },
  "de 4 elegidos": { "en-US": "of 4 selected", "zh-CN": "已选，共 4 个" },
  "Elige al menos un hábito para continuar.": {
    "en-US": "Choose at least one habit to continue.",
    "zh-CN": "至少选一个习惯才能继续。",
  },
  "Empezar con lo que elegí": { "en-US": "Start with what I chose", "zh-CN": "用我选的开始" },
  "Guardar selección": { "en-US": "Save selection", "zh-CN": "保存选择" },
  Cancelar: { "en-US": "Cancel", "zh-CN": "取消" },
  "Puedes elegir hasta cuatro hábitos. Quita uno para elegir otro.": {
    "en-US": "You can choose up to four habits. Remove one to choose another.",
    "zh-CN": "最多选四个习惯。去掉一个才能再选。",
  },
  "Puedes elegir hasta cuatro hábitos. Quita uno para incluir este.": {
    "en-US": "You can choose up to four habits. Remove one to include this.",
    "zh-CN": "最多选四个习惯。去掉一个才能加入这个。",
  },
  "Un día a la vez": { "en-US": "One day at a time", "zh-CN": "一天一步" },
  "Hoy, elige un paso a tu ritmo.": {
    "en-US": "Today, choose a step at your pace.",
    "zh-CN": "今天，按你的节奏选一步。",
  },
  "a tu ritmo.": { "en-US": "at your pace.", "zh-CN": "按你的节奏。" },
  "No hay rachas que perder. Haz espacio para lo que te hace bien, sin exigencias.": {
    "en-US": "There is no streak to lose. Make room for what helps you, without demands.",
    "zh-CN": "没有连胜要守。给对自己有益的事留一点空间，不必苛求。",
  },
  "Ir a mis hábitos": { "en-US": "Go to my habits", "zh-CN": "去我的习惯" },
  "TU PASO DE HOY": { "en-US": "YOUR STEP TODAY", "zh-CN": "今天的一步" },
  hábito: { "en-US": "habit", "zh-CN": "个习惯" },
  hábitos: { "en-US": "habits", "zh-CN": "个习惯" },
  "Un paso pequeño también cuenta.": { "en-US": "A small step counts too.", "zh-CN": "一小步也算数。" },
  "Hoy hiciste espacio para ti.": { "en-US": "You made space for yourself today.", "zh-CN": "今天你为自己留出了空间。" },
  "Ya registraste un paso. Sigue a tu ritmo.": {
    "en-US": "You already logged a step. Continue at your pace.",
    "zh-CN": "你已经记下了一步。按你的节奏继续。",
  },
  "Pausa con Blu": { "en-US": "Pause with Blu", "zh-CN": "和 Blu 暂停一下" },
  Hoy: { "en-US": "Today", "zh-CN": "今天" },
  "Tu semana": { "en-US": "Your week", "zh-CN": "你的一周" },
  Progreso: { "en-US": "Progress", "zh-CN": "进展" },
  Privacidad: { "en-US": "Privacy", "zh-CN": "隐私" },
  "Hábitos que elegiste": { "en-US": "Habits you chose", "zh-CN": "你选的习惯" },
  "Cambiar selección": { "en-US": "Change selection", "zh-CN": "更改选择" },
  Marcar: { "en-US": "Mark", "zh-CN": "完成" },
  Desmarcar: { "en-US": "Unmark", "zh-CN": "取消完成" },
  "Movimiento natural": { "en-US": "Natural movement", "zh-CN": "自然活动" },
  "Alimentación consciente": { "en-US": "Mindful eating", "zh-CN": "用心进食" },
  "Descanso y calma": { "en-US": "Rest and calm", "zh-CN": "休息与平静" },
  "Vínculos cercanos": { "en-US": "Close bonds", "zh-CN": "亲近关系" },
  Comunidad: { "en-US": "Community", "zh-CN": "社区" },
  "Conexión con el entorno": { "en-US": "Connection with your surroundings", "zh-CN": "与环境的连接" },
  Propósito: { "en-US": "Purpose", "zh-CN": "目标感" },
  "Blu te espera, sin prisa.": { "en-US": "Blu is waiting, in no hurry.", "zh-CN": "Blu 在等你，不着急。" },
  "Blu se anima: ya diste un paso.": { "en-US": "Blu perks up: you already took a step.", "zh-CN": "Blu 来劲了：你已经走了一步。" },
  "Blu celebra contigo. Hoy hubo espacio.": {
    "en-US": "Blu celebrates with you. There was room today.",
    "zh-CN": "Blu 和你一起庆祝。今天有了空间。",
  },
  "Blu está contento de acompañarte estos días.": {
    "en-US": "Blu is glad to be with you these days.",
    "zh-CN": "这些天 Blu 很高兴陪着你。",
  },
  "Blu descansa a tu lado. Un paso basta cuando quieras.": {
    "en-US": "Blu rests beside you. One step is enough whenever you want.",
    "zh-CN": "Blu 在你身边休息。想做的时候，一步就够。",
  },
  "Tu punto de partida": { "en-US": "Your starting point", "zh-CN": "你的起点" },
  "Esto no es un diagnóstico. Es lo que declaras hoy; la práctica de los próximos días lo va afinando.": {
    "en-US": "This is not a diagnosis. It is what you say today; practice over the next days will sharpen it.",
    "zh-CN": "这不是诊断。这是你今天的自述；接下来几天的练习会把它慢慢校准。",
  },
  "Me cuesta": { "en-US": "This is hard for me", "zh-CN": "我觉得难" },
  "Voy a medias": { "en-US": "I am in between", "zh-CN": "我做得一般" },
  "Ya lo cuido": { "en-US": "I already care for this", "zh-CN": "我已经在照顾" },
  "Guardar mi punto de partida": { "en-US": "Save my starting point", "zh-CN": "保存我的起点" },
  "Ahora no": { "en-US": "Not now", "zh-CN": "现在先不" },
  "Completar punto de partida": { "en-US": "Complete starting point", "zh-CN": "补上起点" },
  "Actualizar lo que declaré": { "en-US": "Update what I said", "zh-CN": "更新我的自述" },
  "Hacer el autodiagnóstico largo (opcional, experimental)": {
    "en-US": "Take the longer self-check (optional, experimental)",
    "zh-CN": "做更长的自我评估（可选，实验性）",
  },
  "¿Prefieres partir con una autoevaluación?": {
    "en-US": "Would you rather start with a self-check?",
    "zh-CN": "想先做一次自我评估吗？",
  },
  "Hola, soy Blu. Te acompaño en pasos pequeños, sin promesas grandes.": {
    "en-US": "Hi, I'm Blu. I walk with you in small steps, without big promises.",
    "zh-CN": "你好，我是 Blu。我陪你走一小步，不做大承诺。",
  },
  "Tus datos, bajo tu control": {
    "en-US": "Your data, under your control",
    "zh-CN": "你的数据，由你做主",
  },
  "Todo lo que guardas en Blu vive en este navegador. Puedes llevártelo o borrarlo cuando quieras: sin cuentas y sin nube.": {
    "en-US": "Everything you save in Blu stays in this browser. You can take it with you or delete it whenever you want: no account and no cloud.",
    "zh-CN": "你在 Blu 里保存的一切都留在这个浏览器中。你可以随时带走或删除：没有账号，也没有云端。",
  },
  "Exportar mis datos": { "en-US": "Export my data", "zh-CN": "导出我的数据" },
  "Un archivo JSON con todo lo guardado aquí.": {
    "en-US": "A JSON file with everything saved here.",
    "zh-CN": "一个包含这里全部记录的 JSON 文件。",
  },
  Consentimientos: { "en-US": "Consents", "zh-CN": "同意事项" },
  "Revisa o retira lo que permitiste.": {
    "en-US": "Review or withdraw what you allowed.",
    "zh-CN": "查看或撤回你允许的内容。",
  },
  "Borrar todos los datos": { "en-US": "Delete all data", "zh-CN": "删除全部数据" },
  "Elimina todo y verifica el borrado.": {
    "en-US": "Deletes everything and checks that it is gone.",
    "zh-CN": "删除全部内容，并确认已经删掉。",
  },
  "Blu es un prototipo de bienestar: acompaña hábitos, no diagnostica ni trata.": {
    "en-US": "Blu is a wellbeing prototype: it accompanies habits. It does not diagnose or treat.",
    "zh-CN": "Blu 是一个健康习惯原型：它陪伴习惯，不诊断，也不治疗。",
  },
  "Entiendo que esto es un prototipo. Guardo mis hábitos y registros solo en este navegador, sin cifrado ni sincronización, y puedo borrarlos desde Blu. (requerido)": {
    "en-US": "I understand this is a prototype. I keep my habits and records only in this browser, without encryption or sync, and I can delete them from Blu. (required)",
    "zh-CN": "我明白这是一个原型。我的习惯和记录只保存在这个浏览器里，没有加密，也不会同步，而且我可以在 Blu 里删除它们。（必选）",
  },
  "Acepto que datos agregados y anónimos orienten la mejora del producto. (opcional)": {
    "en-US": "I agree that aggregated, anonymous data may guide product improvements. (optional)",
    "zh-CN": "我同意用汇总后的匿名数据来改进产品。（可选）",
  },
  "Acepto que datos agregados y anónimos se usen en investigación con revisión ética. (opcional)": {
    "en-US": "I agree that aggregated, anonymous data may be used in research with ethics review. (optional)",
    "zh-CN": "我同意把汇总后的匿名数据用于经过伦理审查的研究。（可选）",
  },
  "Me sentí bien": { "en-US": "I felt well", "zh-CN": "我感觉不错" },
  "Más o menos igual": { "en-US": "About the same", "zh-CN": "差不多" },
  "Se me hizo difícil": { "en-US": "It was hard for me", "zh-CN": "我觉得难" },
  "Mantener como está": { "en-US": "Keep it as it is", "zh-CN": "保持现状" },
  "Ajustar un hábito": { "en-US": "Adjust one habit", "zh-CN": "调整一个习惯" },
  "Hola, soy Blu. Te acompaño en pasos pequeños: nada de promesas grandes. ¿Qué te está costando más hoy: el tiempo, la energía o acordarte?": {
    "en-US": "Hi, I'm Blu. I walk with you in small steps: no big promises. What is harder today: time, energy, or remembering?",
    "zh-CN": "你好，我是 Blu。我陪你走一小步，不做大承诺。今天更难的是时间、精力，还是记得做？",
  },
  "No incluyas datos personales ni información médica.": {
    "en-US": "Do not include personal data or medical information.",
    "zh-CN": "请不要写入个人资料或医疗信息。",
  },
  "La conexión y el propósito también se construyen con gestos pequeños, elegidos por ti.": {
    "en-US": "Connection and purpose are also built with small gestures you choose.",
    "zh-CN": "连接和目标感，也是由你自己选择的小动作慢慢形成的。",
  },
  "Reflexión, no consejo clínico": {
    "en-US": "A reflection, not clinical advice",
    "zh-CN": "这是一段反思，不是医疗建议",
  },
  "UNA IDEA PARA HOY": { "en-US": "ONE IDEA FOR TODAY", "zh-CN": "今天的一个想法" },
  "Algunos temas que ya tenías no están entre los cuatro pilares. Puedes quitarlos y elegir de nuevo.": {
    "en-US": "Some themes you already had are not among the four pillars. You can remove them and choose again.",
    "zh-CN": "你以前选过的一些主题不在这四个支柱里。你可以去掉它们，再重新选择。",
  },
  "Lo hice": { "en-US": "I did it", "zh-CN": "我做到了" },
  "¿Qué tienes en mente?": { "en-US": "What's on your mind?", "zh-CN": "你在想什么？" },
  "Escribe una reflexión": { "en-US": "Write a reflection", "zh-CN": "写下一句感想" },
  "Cuatro pilares: alimentación, movimiento, comunidad y propósito.": {
    "en-US": "Four pillars: food, movement, community, and purpose.",
    "zh-CN": "四个支柱：饮食、活动、社区和目标感。",
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function translate(locale: Locale, source: string): string {
  if (locale === "es") return source;
  return DICTIONARY[source]?.[locale] ?? source;
}

const listeners = new Set<() => void>();

function readLocale(): Locale {
  if (typeof window === "undefined") return "es";
  try {
    const raw = window.localStorage.getItem(LOCALE_KEY);
    return isLocale(raw) ? raw : "es";
  } catch {
    return "es";
  }
}

export function getLocale(): Locale {
  return readLocale();
}

export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.lang = locale;
  for (const listener of listeners) listener();
}

export function subscribeLocale(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
