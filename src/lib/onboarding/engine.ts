import type { Question, QuestionBank } from "./bank";

export type QuestionAnswer =
  | { kind: "value"; value: number | string | Array<number | string> }
  | { kind: "skipped" };

export interface Assessment {
  bankVersion: string;
  startedAt: string;
  updatedAt: string;
  status: "in_progress" | "completed";
  answers: Record<string, QuestionAnswer>;
}

export function createAssessment(bank: QuestionBank, now = new Date().toISOString()): Assessment {
  return {
    bankVersion: bank.bankVersion,
    startedAt: now,
    updatedAt: now,
    status: "in_progress",
    answers: {},
  };
}

export function findQuestion(bank: QuestionBank, questionId: string): Question | undefined {
  for (const principle of bank.principles) {
    const found = principle.questions.find((q) => q.id === questionId);
    if (found) return found;
  }
  return undefined;
}

function isRuleSkipped(question: Question, answers: Record<string, QuestionAnswer>): boolean {
  if (!question.skipIf) return false;
  const referenced = answers[question.skipIf.question];
  if (!referenced || referenced.kind !== "value") return false;
  if (Array.isArray(referenced.value)) return false;
  return question.skipIf.in.includes(referenced.value);
}

export function getEffectiveQuestions(bank: QuestionBank, assessment: Assessment): Question[] {
  const all = bank.principles.flatMap((p) => p.questions);
  return all.filter((q) => !isRuleSkipped(q, assessment.answers));
}

function assertAnswerable(bank: QuestionBank, assessment: Assessment, questionId: string): Question {
  const question = findQuestion(bank, questionId);
  if (!question) throw new Error(`Pregunta desconocida: «${questionId}».`);
  // si el banco cambió de versión, las respuestas nuevas se validan contra la estructura
  // vigente, pero el assessment conserva su bankVersion original para trazabilidad.
  if (isRuleSkipped(question, assessment.answers)) {
    throw new Error(`La pregunta «${questionId}» está omitida por una regla del cuestionario.`);
  }
  return question;
}

function assertValue(question: Question, value: number | string | Array<number | string>): void {
  if (question.type === "multi_choice") {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`La pregunta «${question.id}» requiere una lista de alternativas no vacía.`);
    }
    const allowed = new Set((question.options ?? []).map((o) => o.value));
    for (const item of value) {
      if (!allowed.has(item)) {
        throw new Error(`El valor «${String(item)}» no está entre las alternativas de «${question.id}».`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    throw new Error(`La pregunta «${question.id}» no admite respuestas múltiples.`);
  }
  if (question.type === "likert5") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
      throw new Error(`La pregunta «${question.id}» admite valores enteros entre 0 y 4.`);
    }
    return;
  }
  const allowed = new Set((question.options ?? []).map((o) => o.value));
  if (!allowed.has(value)) {
    throw new Error(`El valor «${String(value)}» no está entre las alternativas de «${question.id}».`);
  }
}

function withCompletion(bank: QuestionBank, assessment: Assessment): Assessment {
  const complete = getEffectiveQuestions(bank, assessment).every((q) => assessment.answers[q.id]);
  return { ...assessment, status: complete ? "completed" : "in_progress" };
}

export function answerQuestion(
  bank: QuestionBank,
  assessment: Assessment,
  questionId: string,
  value: number | string | Array<number | string>,
): Assessment {
  const question = assertAnswerable(bank, assessment, questionId);
  assertValue(question, value);
  const next: Assessment = {
    ...assessment,
    updatedAt: new Date().toISOString(),
    answers: { ...assessment.answers, [questionId]: { kind: "value", value } },
  };
  return withCompletion(bank, next);
}

export function skipQuestion(bank: QuestionBank, assessment: Assessment, questionId: string): Assessment {
  const question = assertAnswerable(bank, assessment, questionId);
  if (!question.skippable) {
    throw new Error(`La pregunta «${questionId}» no es omisible.`);
  }
  const next: Assessment = {
    ...assessment,
    updatedAt: new Date().toISOString(),
    answers: { ...assessment.answers, [questionId]: { kind: "skipped" } },
  };
  return withCompletion(bank, next);
}

export function isAssessmentComplete(bank: QuestionBank, assessment: Assessment): boolean {
  return getEffectiveQuestions(bank, assessment).every((q) => assessment.answers[q.id]);
}

export function firstUnansweredIndex(bank: QuestionBank, assessment: Assessment): number {
  const effective = getEffectiveQuestions(bank, assessment);
  const index = effective.findIndex((q) => !assessment.answers[q.id]);
  return index === -1 ? effective.length : index;
}
