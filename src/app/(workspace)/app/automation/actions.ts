"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/guard";
import {
  ACTIONS,
  CONDITION_FIELDS,
  TRIGGERS,
  createRule,
  deleteRule,
  setRuleEnabled,
  type RuleAction,
  type RuleCondition,
} from "@/lib/automation";
import { parseForm, shortText, uuidSchema } from "@/lib/validation/schemas";

const triggerKeys: readonly string[] = TRIGGERS.map((t) => t.key);
const fieldKeys = CONDITION_FIELDS as readonly string[];
const actionKeys: readonly string[] = ACTIONS.map((a) => a.key);

const ruleSchema = z.object({
  name: shortText(120),
  trigger: z.string().refine((v) => triggerKeys.includes(v), "Invalid trigger."),
  conditionField: z.string().optional().default(""),
  conditionOperator: z.enum(["equals", "contains"]).catch("equals"),
  conditionValue: shortText(200, { min: 0 }),
  actionType: z.string().optional().default(""),
  actionValue: shortText(200, { min: 0 }),
});

export async function createRuleAction(formData: FormData) {
  const ctx = await requireStaff();
  const parsed = parseForm(ruleSchema, formData);
  if (!parsed.success) redirect("/app/automation?error=invalid");

  const input = parsed.data;

  const conditions: RuleCondition[] = [];
  if (input.conditionValue && fieldKeys.includes(input.conditionField)) {
    conditions.push({
      field: input.conditionField as RuleCondition["field"],
      operator: input.conditionOperator,
      value: input.conditionValue,
    });
  }

  const actions: RuleAction[] = [];
  if (actionKeys.includes(input.actionType)) {
    actions.push({ type: input.actionType as RuleAction["type"], value: input.actionValue });
  }

  await createRule(ctx.organizationId, {
    name: input.name,
    trigger: input.trigger,
    conditions,
    actions,
  });
  revalidatePath("/app/automation");
  redirect("/app/automation?created=1");
}

export async function toggleRuleAction(formData: FormData) {
  const ctx = await requireStaff();
  const parsed = parseForm(
    z.object({ id: uuidSchema, enabled: z.enum(["true", "false"]).catch("false") }),
    formData,
  );
  if (!parsed.success) return;

  await setRuleEnabled(ctx.organizationId, parsed.data.id, parsed.data.enabled === "true");
  revalidatePath("/app/automation");
}

export async function deleteRuleAction(formData: FormData) {
  const ctx = await requireStaff();
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (!parsed.success) return;

  await deleteRule(ctx.organizationId, parsed.data.id).catch(() => {});
  revalidatePath("/app/automation");
}
