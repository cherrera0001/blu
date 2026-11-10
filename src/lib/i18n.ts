import gaps from "./i18n-gaps.json";

export const LOCALES = ["es", "en-US", "zh-CN"] as const;
export type Locale = (typeof LOCALES)[number];

const LOCALE_KEY = "blu.locale.v1";

/**
 * Castellano es el texto fuente. `translate` devuelve ese texto en `es`
 * y la versión en inglés (EE. UU.) o chino mandarín simplificado en los otros.
 * Si falta una entrada, se conserva el castellano: eso solo es aceptable
 * para texto libre que no es de la interfaz. Las frases de pantalla viven
 * en este diccionario o en i18n-gaps.json.
 */
const DICTIONARY: Record<string, Record<Exclude<Locale, "es">, string>> = {
  ...(gaps as Record<string, { "en-US": string; "zh-CN": string }>),
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
  "Un archivo con todo lo guardado aquí.": {
    "en-US": "A file with everything saved here.",
    "zh-CN": "一个包含这里全部记录的文件。",
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
  "Enviar": { "en-US": "Send", "zh-CN": "发送" },
  "Apodo (opcional)": { "en-US": "Nickname (optional)", "zh-CN": "昵称（可选）" },
  "No pude guardar el punto de partida en este navegador.": {
    "en-US": "I could not save the starting point in this browser.",
    "zh-CN": "没法把起点保存在这个浏览器里。",
  },
  "Punto de partida guardado. Se irá afinando con los pasos que marques.": {
    "en-US": "Starting point saved. It will sharpen as you mark steps.",
    "zh-CN": "起点已保存。你记下的每一步会慢慢把它校准。",
  },
  "Voz del dispositivo activada. La lectura no envía texto a Microsoft.": {
    "en-US": "Device voice is on. Reading does not send text to Microsoft.",
    "zh-CN": "已使用设备语音。朗读不会把文字发给 Microsoft。",
  },
  "La voz natural aún no está configurada. Puedes seguir usando la voz de tu dispositivo.": {
    "en-US": "Natural voice is not set up yet. You can keep using your device voice.",
    "zh-CN": "自然语音还没配置。你可以继续用设备上的语音。",
  },
  "Voz natural activada para esta sesión.": {
    "en-US": "Natural voice is on for this session.",
    "zh-CN": "本次已开启自然语音。",
  },
  "Voz natural activa. Escuchar usa el audio del servidor.": {
    "en-US": "Natural voice is on. Listen uses server audio.",
    "zh-CN": "自然语音已开启。朗读使用服务器音频。",
  },
  "No pude comprobar la voz natural. Puedes seguir usando la voz de tu dispositivo.": {
    "en-US": "I could not check the natural voice. You can keep using your device voice.",
    "zh-CN": "没法确认自然语音。你可以继续用设备上的语音。",
  },
  "La exportación quedó incompleta: no pude leer algunas categorías. El JSON descargado incluye el detalle en «errors».": {
    "en-US": "The export is incomplete: I could not read some categories. The downloaded JSON includes the detail in “errors”.",
    "zh-CN": "导出不完整：有些类别没读到。下载的 JSON 在 errors 里写了详情。",
  },
  "Exportaste tus datos. Revisa tu carpeta de descargas.": {
    "en-US": "You exported your data. Check your downloads folder.",
    "zh-CN": "数据已导出。请查看下载文件夹。",
  },
  "No pude preparar la exportación en este navegador.": {
    "en-US": "I could not prepare the export in this browser.",
    "zh-CN": "没法在这个浏览器里准备导出。",
  },
  "Revisión guardada. Gracias por mirar tu semana.": {
    "en-US": "Review saved. Thank you for looking at your week.",
    "zh-CN": "回顾已保存。谢谢你看看这一周。",
  },
  "No se pudo guardar tu revisión.": {
    "en-US": "Your review could not be saved.",
    "zh-CN": "没法保存这次回顾。",
  },
  "Quedó registrado que omitiste esta semana.": {
    "en-US": "It is recorded that you skipped this week.",
    "zh-CN": "已记下你跳过了这一周。",
  },
  "Recordatorio desactivado. Puedes activarlo cuando quieras.": {
    "en-US": "Reminder off. You can turn it on whenever you want.",
    "zh-CN": "提醒已关闭。你想开的时候可以再开。",
  },
  "Recordatorio activado: máximo uno al día, solo si quedan pasos sin marcar.": {
    "en-US": "Reminder on: at most one a day, only if some steps are still unmarked.",
    "zh-CN": "提醒已开启：每天最多一次，只在还有未完成的步骤时。",
  },
  "Sin permiso del navegador, no activo nada. Puedes intentarlo de nuevo desde la configuración del sitio.": {
    "en-US": "Without the browser's permission, nothing is turned on. You can try again from the site settings.",
    "zh-CN": "浏览器没有允许，所以什么都没开启。你可以在网站设置里再试一次。",
  },
  "Este hábito ya está en su versión más pequeña.": {
    "en-US": "This habit is already at its smallest version.",
    "zh-CN": "这个习惯已经是最小的版本了。",
  },
  "Listo. Dejé registrada la versión más pequeña que elegiste.": {
    "en-US": "Done. I saved the smaller version you chose.",
    "zh-CN": "好了。已记下你选的更小版本。",
  },
  "Se deshizo el último ajuste. Puedes elegir otro cuando quieras.": {
    "en-US": "The last adjustment was undone. You can choose another whenever you want.",
    "zh-CN": "上次调整已撤销。你想换的时候可以再选。",
  },
  "¿Borrar de este navegador tus hábitos, registros, cuestionario, objetivos y revisiones de Blu?": {
    "en-US": "Delete from this browser your Blu habits, records, questionnaire, goals, and reviews?",
    "zh-CN": "要从这个浏览器删除你在 Blu 的习惯、记录、问卷、目标和回顾吗？",
  },
  "Se borraron todos los datos de Blu en este navegador.": {
    "en-US": "All Blu data in this browser was deleted.",
    "zh-CN": "这个浏览器里的 Blu 数据已全部删除。",
  },
  "Esa versión ya está activa para este hábito.": {
    "en-US": "That version is already active for this habit.",
    "zh-CN": "这个习惯已经在用那个版本。",
  },
  "Listo: «{title}» quedó como tu versión actual.": {
    "en-US": "Done: “{title}” is now your current version.",
    "zh-CN": "好了：「{title}」成了你现在的版本。",
  },
  "Semana sugerida creada; puedes moverla como quieras.": {
    "en-US": "Suggested week created; you can move it however you want.",
    "zh-CN": "建议的一周已建好；你可以按自己的方式调整。",
  },
  "No se pudo guardar.": {
    "en-US": "It could not be saved.",
    "zh-CN": "没法保存。",
  },
  "Incluí «{title}» en tus hábitos.": {
    "en-US": "I added “{title}” to your habits.",
    "zh-CN": "已把「{title}」加进你的习惯。",
  },
  "Tu espacio quedó guardado en este navegador.": {
    "en-US": "Your space was saved in this browser.",
    "zh-CN": "你的空间已保存在这个浏览器里。",
  },
  "Borrar mis datos": { "en-US": "Delete my data", "zh-CN": "删除我的数据" },
  "Prefiero no responder": { "en-US": "I would rather not answer", "zh-CN": "先不回答" },
  "Las ideas de este prototipo no son recomendaciones clínicas; su evidencia específica está pendiente de revisión.": {
    "en-US": "The ideas in this prototype are not clinical recommendations; their specific evidence is still under review.",
    "zh-CN": "这个原型里的想法不是临床建议；具体证据还在审阅中。",
  },
  "ACOMPAÑAMIENTO": { "en-US": "COMPANIONSHIP", "zh-CN": "陪伴" },
  "Una pausa con Blu": { "en-US": "A pause with Blu", "zh-CN": "和 Blu 停一下" },
  "Estoy aquí para una pausa breve, con ayuda a través de Blu. No guardamos tu historial; evita compartir datos personales o de salud.": {
    "en-US": "I am here for a short pause, with help through Blu. We do not keep your history; avoid sharing personal or health data.",
    "zh-CN": "我在这里陪你短暂停一下，通过 Blu 得到帮助。我们不保存记录；请不要分享个人或健康信息。",
  },
  "Estoy aquí para una pausa breve. Tu mensaje pasa por Blu para preparar la respuesta; no guardamos el historial de la conversación.": {
    "en-US": "I am here for a short pause. Your message goes through Blu to prepare a reply; we do not keep the conversation history.",
    "zh-CN": "我在这里陪你短暂停一下。你的消息会经 Blu 准备回复；我们不保存对话记录。",
  },
  "Opciones de voz": { "en-US": "Voice options", "zh-CN": "语音选项" },
  "Opciones opcionales de mejora e investigación": {
    "en-US": "Optional improvement and research choices",
    "zh-CN": "可选的改进与研究选项",
  },
  "Recordatorio opcional": {
    "en-US": "Optional reminder",
    "zh-CN": "可选提醒",
  },
  "El servidor pidió esperar. Usé reglas sencillas en tu dispositivo para responder.": {
    "en-US": "The server asked to wait. I used simple rules on your device to answer.",
    "zh-CN": "服务器请你稍等。我改用你设备上的简单规则来回答。",
  },
  "El servidor no pudo responder. Usé reglas sencillas en tu dispositivo.": {
    "en-US": "The server could not answer. I used simple rules on your device.",
    "zh-CN": "服务器没能回答。我改用了你设备上的简单规则。",
  },
  "Tu mensaje se envió al servidor para intentar responder; evita compartir datos personales o de salud.": {
    "en-US": "Your message was sent to the server to try to answer; avoid sharing personal or health data.",
    "zh-CN": "你的消息已发给服务器以便尝试回答；请不要分享个人或健康信息。",
  },
  "Blu está pensando…": { "en-US": "Blu is thinking…", "zh-CN": "Blu 在想…" },
  "Estilo de voz": { "en-US": "Voice style", "zh-CN": "声音风格" },
  "Cálida": { "en-US": "Warm", "zh-CN": "温暖" },
  "Equilibrada": { "en-US": "Balanced", "zh-CN": "平稳" },
  "La voz disponible depende de las opciones de tu dispositivo.": {
    "en-US": "The available voice depends on your device.",
    "zh-CN": "可用的声音取决于你的设备。",
  },
  "Si activas Azure, se enviará a Microsoft solo el texto de Blu que elijas escuchar para crear el audio. No compartas información personal o de salud.": {
    "en-US": "If you turn on Azure, only the Blu text you choose to hear is sent to Microsoft to make the audio. Do not share personal or health information.",
    "zh-CN": "如果打开 Azure，只有你选择朗读的 Blu 文字会发给 Microsoft 来生成声音。请不要分享个人或健康信息。",
  },
  "Comprobando…": { "en-US": "Checking…", "zh-CN": "正在确认…" },
  "Usar voz del dispositivo": { "en-US": "Use this device’s voice", "zh-CN": "用这台设备的声音" },
  "Activar voz natural": { "en-US": "Turn on natural voice", "zh-CN": "打开自然语音" },
  "Estas cifras son solo un registro de uso, no una medida de salud ni de eficacia.": {
    "en-US": "These figures are only a use record, not a measure of health or effectiveness.",
    "zh-CN": "这些数字只是使用记录，不是健康或效果的衡量。",
  },
  "Es un registro personal, no una medida de salud. ¿Quieres probar una versión más pequeña?": {
    "en-US": "It is a personal record, not a measure of health. Want to try a smaller version?",
    "zh-CN": "这是个人记录，不是健康指标。要试试更小的一步吗？",
  },
  "Elige un hábito": { "en-US": "Choose a habit", "zh-CN": "选一个习惯" },
  "Me faltó tiempo": { "en-US": "I did not have time", "zh-CN": "我没有时间" },
  "Tenía poca energía": { "en-US": "I had little energy", "zh-CN": "我精力不够" },
  "Se me olvidó": { "en-US": "I forgot", "zh-CN": "我忘了" },
  "Otra razón": { "en-US": "Another reason", "zh-CN": "其他原因" },
  "Probar más pequeño": { "en-US": "Try a smaller step", "zh-CN": "试更小的一步" },
  "MIRADA SEMANAL": { "en-US": "WEEKLY LOOK", "zh-CN": "本周一看" },
  "Revisión de tu semana": { "en-US": "Your week in review", "zh-CN": "回顾你的一周" },
  "Últimos 7 días · es un registro personal, no una medida de salud.": {
    "en-US": "Last 7 days · a personal record, not a measure of health.",
    "zh-CN": "最近 7 天 · 这是个人记录，不是健康指标。",
  },
  "Si quieres, cuéntame cómo te fue y qué prefieres para la próxima semana.": {
    "en-US": "If you want, tell me how it went and what you prefer for next week.",
    "zh-CN": "如果你愿意，告诉我这周怎么样，以及下周你更想怎么做。",
  },
  "Responder cómo me sentí": { "en-US": "Say how I felt", "zh-CN": "说说我的感觉" },
  "Actualizar mi respuesta": { "en-US": "Update my answer", "zh-CN": "更新我的回答" },
  "¿Cómo te sentiste con tus hábitos?": { "en-US": "How did your habits feel?", "zh-CN": "这些习惯让你感觉如何？" },
  "¿Qué quieres hacer la próxima semana?": { "en-US": "What do you want to do next week?", "zh-CN": "下周你想怎么做？" },
  "Guardar revisión": { "en-US": "Save review", "zh-CN": "保存回顾" },
  "Sin pasos": { "en-US": "No steps", "zh-CN": "没有步骤" },
  "paso": { "en-US": "step", "zh-CN": "步" },
  "pasos": { "en-US": "steps", "zh-CN": "步" },
  "Autodiagnóstico": { "en-US": "Self check-in", "zh-CN": "自我了解" },
  "No pude cargar el cuestionario": { "en-US": "I could not load the questionnaire", "zh-CN": "问卷没能打开" },
  "El cuestionario no se pudo cargar.": { "en-US": "The questionnaire could not be loaded.", "zh-CN": "问卷无法加载。" },
  "Borrar datos del cuestionario y reintentar": { "en-US": "Delete questionnaire data and try again", "zh-CN": "删除问卷数据并重试" },
  "Preparando tu autodiagnóstico…": { "en-US": "Preparing your self check-in…", "zh-CN": "正在准备你的自我了解…" },
  "No se pudo guardar tu avance.": { "en-US": "Your progress could not be saved.", "zh-CN": "没法保存你的进度。" },
  "No se pudo registrar tu aceptación en este navegador.": { "en-US": "Your acceptance could not be saved in this browser.", "zh-CN": "没法在这个浏览器记下你的确认。" },
  "No pude leer tu aceptación del aviso": { "en-US": "I could not read your acceptance of the notice", "zh-CN": "没能读到你对提示的确认" },
  "Borrar el aviso y reintentar": { "en-US": "Clear the notice and try again", "zh-CN": "清除提示并重试" },
  "ANTES DE EMPEZAR": { "en-US": "BEFORE YOU START", "zh-CN": "开始之前" },
  "Antes de empezar, un aviso": { "en-US": "Before you start, a notice", "zh-CN": "开始之前，有一句说明" },
  "«Vamos a conocerte un poco. Tus respuestas se quedan en este navegador.»": {
    "en-US": "“Let’s get to know you a little. Your answers stay in this browser.”",
    "zh-CN": "“我们稍微认识一下你。你的回答留在这个浏览器里。”",
  },
  "Este almacenamiento no está cifrado: evita datos médicos o que te identifiquen. Puedes borrar todo con «Borrar datos del cuestionario» o «Borrar mis datos».": {
    "en-US": "This storage is not encrypted: avoid medical data or anything that identifies you. You can delete everything with “Delete questionnaire data” or “Delete my data”.",
    "zh-CN": "这里的存储没有加密：请不要填写医疗信息或能认出你的内容。你可以用「删除问卷数据」或「删除我的数据」全部清掉。",
  },
  "Actualizamos el aviso del cuestionario desde tu última aceptación. Márcalo de nuevo para continuar.": {
    "en-US": "The questionnaire notice changed since you last accepted it. Check it again to continue.",
    "zh-CN": "自从你上次确认后，问卷提示有更新。请再勾选一次才能继续。",
  },
  "Entiendo dónde se guardan mis respuestas y cómo borrarlas.": {
    "en-US": "I understand where my answers are saved and how to delete them.",
    "zh-CN": "我明白回答存在哪里，也知道怎么删除。",
  },
  "Comenzar": { "en-US": "Start", "zh-CN": "开始" },
  "Volver sin guardar nada": { "en-US": "Go back without saving anything", "zh-CN": "返回，不保存任何内容" },
  "No se pudo guardar tu decisión en este navegador.": { "en-US": "Your decision could not be saved in this browser.", "zh-CN": "没法在这个浏览器保存你的选择。" },
  "RESULTADO": { "en-US": "RESULT", "zh-CN": "结果" },
  "Tu autodiagnóstico de hábitos": { "en-US": "Your habit self check-in", "zh-CN": "你的习惯自我了解" },
  "Esta autoevaluación es experimental y orientativa: no es un diagnóstico ni una medida de salud.": {
    "en-US": "This self check-in is experimental and for guidance only: it is not a diagnosis or a measure of health.",
    "zh-CN": "这次自我了解是试验性的，只作参考：它不是诊断，也不是健康指标。",
  },
  "El cuestionario se actualizó desde que empezaste; este resultado usa la versión que respondiste ({version}).": {
    "en-US": "The questionnaire was updated after you started; this result uses the version you answered ({version}).",
    "zh-CN": "你开始之后问卷有更新；这个结果用的是你回答的版本（{version}）。",
  },
  "TU LÍNEA BASE": { "en-US": "YOUR STARTING LINE", "zh-CN": "你的起点" },
  "Punto de partida": { "en-US": "Starting point", "zh-CN": "起点" },
  "Aún no hay base suficiente: respondiste {coverage} de {total} dimensiones y se necesitan al menos {minimum}. Revisa tus respuestas y vuelve: se recalcula al instante.": {
    "en-US": "There is not enough of a base yet: you answered {coverage} of {total} areas and at least {minimum} are needed. Review your answers and come back: it recalculates right away.",
    "zh-CN": "现在还不够算出起点：你回答了 {total} 个方面中的 {coverage} 个，至少需要 {minimum} 个。回去看一看，回来就会马上重算。",
  },
  "de 100 · basado en {coverage} de {total} dimensiones ({answered} de {questions} respuestas puntuables)": {
    "en-US": "out of 100 · based on {coverage} of {total} areas ({answered} of {questions} scored answers)",
    "zh-CN": "分，满分 100 · 基于 {total} 个方面中的 {coverage} 个（{questions} 个可计分回答中的 {answered} 个）",
  },
  "Medida descriptiva y experimental para tu reflexión personal: no es un diagnóstico, no compara con otras personas y no predice resultados de salud.": {
    "en-US": "A descriptive, experimental measure for your own reflection: it is not a diagnosis, it does not compare you with other people, and it does not predict health outcomes.",
    "zh-CN": "这是供你自己对照的描述性试验数字：不是诊断，不和别人比较，也不预测健康结果。",
  },
  "¿Cómo se calcula?": { "en-US": "How is it calculated?", "zh-CN": "怎么算的？" },
  "Promedio de las dimensiones respondidas (cada una va de 0 a 100 según tus respuestas). Las preguntas omitidas no bajan el puntaje: solo reducen la cobertura.": {
    "en-US": "Average of the areas you answered (each goes from 0 to 100 according to your answers). Skipped questions do not lower the number: they only reduce how much is covered.",
    "zh-CN": "已回答方面的平均（每个方面按你的回答从 0 到 100）。跳过的问题不会拉低数字，只会减少覆盖范围。",
  },
  "Revisar mis respuestas": { "en-US": "Review my answers", "zh-CN": "查看我的回答" },
  "Corregir recalcula tu línea base al momento.": { "en-US": "A correction recalculates your starting line right away.", "zh-CN": "一改，起点马上重算。" },
  "Cuando repitas la autoevaluación, la nueva línea base reemplaza a esta: por ahora no guardamos historial.": {
    "en-US": "When you repeat the self check-in, the new starting line replaces this one: for now we do not keep a history.",
    "zh-CN": "你再做一次时，新的起点会替换这一次：目前不保留历史。",
  },
  "Sin nivel aún": { "en-US": "No level yet", "zh-CN": "还没有程度" },
  "Espacio para cuidarte": { "en-US": "Room to care for yourself", "zh-CN": "还有照顾自己的空间" },
  "En desarrollo": { "en-US": "Developing", "zh-CN": "正在形成" },
  "Fortaleza": { "en-US": "Strength", "zh-CN": "已经稳" },
  "Menor confianza (omitiste algunas preguntas).": { "en-US": "Lower confidence (you skipped some questions).", "zh-CN": "把握小一些（你跳过了几题）。" },
  "Sugerencias para partir": { "en-US": "Ideas to start with", "zh-CN": "起步的想法" },
  "Este cuestionario propone hasta tres ideas. En Blu puedes cuidar hasta cuatro.": {
    "en-US": "This questionnaire suggests up to three ideas. In Blu you can care for up to four.",
    "zh-CN": "这份问卷最多提出三个想法。在 Blu 里你最多可以照顾四个。",
  },
  "Sin sugerencias por ahora. Tú decides siempre.": { "en-US": "No ideas for now. You always decide.", "zh-CN": "现在没有建议。始终由你决定。" },
  "Elegir tus hábitos manualmente": { "en-US": "Choose your habits yourself", "zh-CN": "自己选择习惯" },
  "Guardado en tus objetivos. Puedes ajustarlo en la pantalla de hábitos.": {
    "en-US": "Saved in your goals. You can adjust it on the habits screen.",
    "zh-CN": "已存在你的目标里。你可以在习惯那一屏再调整。",
  },
  "Rechazada; no se guardó nada.": { "en-US": "Declined; nothing was saved.", "zh-CN": "已拒绝；什么都没保存。" },
  "Aceptar": { "en-US": "Accept", "zh-CN": "接受" },
  "Rechazar": { "en-US": "Decline", "zh-CN": "拒绝" },
  "Aceptar {title}": { "en-US": "Accept {title}", "zh-CN": "接受 {title}" },
  "Rechazar {title}": { "en-US": "Decline {title}", "zh-CN": "拒绝 {title}" },
  "Puedes usar esto para elegir hábitos, o ignorarlo por completo: tú decides.": {
    "en-US": "You can use this to choose habits, or ignore it completely: you decide.",
    "zh-CN": "你可以用它来选习惯，也可以完全不管：由你决定。",
  },
  "Repetir evaluación": { "en-US": "Repeat the check-in", "zh-CN": "再做一次" },
  "Volver a Blu": { "en-US": "Back to Blu", "zh-CN": "回到 Blu" },
  "Cuestionario completado": { "en-US": "Questionnaire complete", "zh-CN": "问卷已完成" },
  "Pregunta {n} de {total}": { "en-US": "Question {n} of {total}", "zh-CN": "第 {n} 题，共 {total} 题" },
  "El cuestionario cambió de versión desde tu última sesión; conservamos tu avance.": {
    "en-US": "The questionnaire version changed since your last session; we kept your progress.",
    "zh-CN": "自从上次之后问卷版本变了；你的进度还在。",
  },
  "Volver a mi resultado": { "en-US": "Back to my result", "zh-CN": "回到我的结果" },
  "Anterior": { "en-US": "Back", "zh-CN": "上一题" },
  "Siguiente": { "en-US": "Next", "zh-CN": "下一题" },
  "Ver mi resultado": { "en-US": "See my result", "zh-CN": "看我的结果" },
  "Autoevaluación orientativa de hábitos. No es un diagnóstico médico ni una escala psicométrica validada.": {
    "en-US": "A guiding self check-in about habits. It is not a medical diagnosis or a validated psychometric scale.",
    "zh-CN": "这是关于习惯的参考性自我了解。不是医学诊断，也不是经过验证的心理量表。",
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
