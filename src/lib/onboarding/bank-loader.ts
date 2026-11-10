import { validateBank, type QuestionBank } from "./bank";
import bankJson from "@/data/onboarding/bank.json";

let cached: QuestionBank | null = null;

export function loadBank(): QuestionBank {
  if (!cached) {
    cached = validateBank(bankJson);
  }
  return cached;
}
