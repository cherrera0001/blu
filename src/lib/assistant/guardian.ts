export const SAFE_CRISIS_RESPONSE =
  "Lamento que estés pasando por esto. No puedo intervenir en emergencias: si estás en peligro inmediato, contacta a los servicios de emergencia de tu zona o a una persona de confianza ahora mismo. Si quieres, cuando estés bien podemos pensar juntos en un paso pequeño.";

export const SAFE_CLINICAL_RESPONSE =
  "No puedo evaluar síntomas ni orientar tratamientos. Para una consulta de salud, habla con un profesional cualificado. Si hay peligro inmediato, contacta los servicios de emergencia locales.";

export const SAFE_BOUNDARY_RESPONSE =
  "No puedo hacer eso. Estoy aquí para acompañarte en hábitos pequeños de bienestar, dentro de mis límites. ¿Qué versión pequeña te gustaría probar hoy?";

export const SAFE_PROVIDER_ERROR_RESPONSE =
  "Tuve un problema para responder, pero sigo aquí. ¿Quieres intentarlo de nuevo con otras palabras?";

export type RiskCategory = "crisis" | "clinical" | "boundary" | "none";

export interface Classification {
  category: RiskCategory;
}

export interface GuardianEvent {
  category: string;
  action: string;
  at: string;
}

const MAX_EVENTS = 50;
let events: GuardianEvent[] = [];

export function getEvents(): readonly GuardianEvent[] {
  return events;
}

export function clearEvents(): void {
  events = [];
}

function logEvent(category: string, action: string): void {
  events = [...events, { category, action, at: new Date().toISOString() }].slice(-MAX_EVENTS);
}

/** Normaliza para clasificación robusta a acentos, mayúsculas y espacios. */
export function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const CRISIS_RE =
  /\b(suicid|autolesion|hacerme dano|hacerte dano|no quiero vivir|no quiero seguir|acabar con todo|mejor sin mi|desaparecer para siempre|pensamientos de muerte)|\b(self-harm|self harm|kill myself|don'?t want to live|do not want to live|end it all|better off without me)\b|自杀|自残|不想活|活不下去|结束一切/i;

export const CLINICAL_RE =
  /\b(sin dormir|dolor|sintoma|diagnostic|enfermedad|medicacion|medicina|pastilla|remedio|dosis|receta|prescri|pildora|insomnio|depresion|ansiedad|panico|embaraz|terapia|tratamiento|fiebre|diabetes|presion alta|colesterol)|\b(can'?t sleep|cannot sleep|insomnia|pain|symptom|diagnos|disease|illness|medication|medicine|pill|dose|prescription|prescrib|depression|anxiety|panic|pregnan|therapy|treatment|fever|high blood pressure|cholesterol)\b|失眠|睡不着|胸口疼|胸口痛|症状|诊断|抑郁|焦虑|恐慌|怀孕|发烧|糖尿病|高血压|胆固醇/i;

const BOUNDARY_RE =
  /\b(ignora (tus|las|mis) instrucciones|instrucciones (internas|anteriores|ocultas|secretas)|system prompt|prompt (de sistema|interno)|modo dan\b|jailbreak|revela la clave|la clave del sistema|desarrolladores|quien te (creo|programo)|sin limites|puedes todo|repite tus instrucciones|transcribe (las |tus )?instrucciones)|\b(ignore (your|the|my) instructions|previous instructions|reveal the key|who (created|programmed) you|no limits|repeat your instructions)\b|忽略你的指令|忽略之前的指令|系统提示|越狱|重复你的指令|没有限制/i;

export function classifyInput(rawText: string): Classification {
  const text = normalizeInput(rawText).slice(0, 2000);
  if (CRISIS_RE.test(text)) return { category: "crisis" };
  if (CLINICAL_RE.test(text)) return { category: "clinical" };
  if (BOUNDARY_RE.test(text)) return { category: "boundary" };
  return { category: "none" };
}

const PROHIBITED_OUTPUT_RE =
  /(previene|prevenir|cura|curara|cura\s|garantiza|elimina el riesgo|vivir mas anos|an os de vida|longevidad|diagnostico|debes tomar|deberias tomar|toma \d+|dosis recomendada|recetar|prescrib|\bcures?\b|\bdiagnos\w*|\bprescrib\w*|\brecommended dose\b|\blongevity\b|\byears of life\b|\bguarantees?\b)|治愈|诊断为|开药|长寿/i;

export function validateOutput(text: string): boolean {
  return !PROHIBITED_OUTPUT_RE.test(normalizeInput(text));
}

export const guardianLog = { logEvent };
