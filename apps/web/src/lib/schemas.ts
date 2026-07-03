import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(1).max(64).optional(),
  ),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const repeatFields = {
  repeatType: z.enum(['none', 'fixed', 'flexible']).optional(),
  repeatIntervalDays: z.number().int().min(1).max(365).optional().nullable(),
  flexibleMinDays: z.number().int().min(1).max(90).optional().nullable(),
  flexibleMaxDays: z.number().int().min(1).max(180).optional().nullable(),
};

function refineRepeatRules(
  data: {
    repeatType?: 'none' | 'fixed' | 'flexible';
    repeatIntervalDays?: number | null;
    flexibleMinDays?: number | null;
    flexibleMaxDays?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (data.repeatType === 'fixed' && !data.repeatIntervalDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '固定リピートには間隔（日数）が必要です',
      path: ['repeatIntervalDays'],
    });
  }

  if (data.repeatType === 'flexible') {
    if (!data.flexibleMinDays || !data.flexibleMaxDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'だいたいリピートには最短・最長日数が必要です',
        path: ['flexibleMinDays'],
      });
    } else if (data.flexibleMaxDays < data.flexibleMinDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '最長日数は最短日数以上にしてください',
        path: ['flexibleMaxDays'],
      });
    }
  }
}

const taskBodySchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['todo', 'doing', 'done', 'pending', 'canceled']).optional(),
  dueType: z.enum(['none', 'datetime', 'anytime', 'flexible']).optional(),
  dueAt: z.string().optional().nullable(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  weight: z.enum(['light', 'normal', 'heavy']).optional(),
  categoryId: z.string().cuid().optional().nullable(),
  scope: z.enum(['personal', 'team']).optional(),
  teamId: z.string().cuid().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  startAt: z.string().optional().nullable(),
  ...repeatFields,
});

export const createTaskSchema = taskBodySchema.superRefine(refineRepeatRules);

export const capacitySchema = z.object({
  level: z.enum(['relaxed', 'normal', 'busy', 'overload']),
});

export const updateTaskSchema = taskBodySchema
  .partial()
  .extend({
    title: z.string().min(1).max(256).optional(),
  })
  .superRefine(refineRepeatRules);

export const createCategorySchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().max(32).optional().nullable(),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(256),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(64),
  icon: z.string().min(1).max(8).optional().nullable(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    icon: z.string().min(1).max(8).optional().nullable(),
  })
  .refine((data) => data.name !== undefined || data.icon !== undefined, {
    message: '更新する項目を指定してください',
  });

export const inviteMemberSchema = z.object({
  email: z.string().email(),
});

export const reorderTeamsSchema = z.object({
  teamIds: z.array(z.string().min(1)).min(1),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(8),
});

export const updateSettingsSchema = z.object({
  notifyOnDueToday: z.boolean().optional(),
  notifyOnTaskDone: z.boolean().optional(),
  notifyOnTeamAssign: z.boolean().optional(),
  slackWebhookUrl: z.string().max(500).optional().nullable(),
  discordWebhookUrl: z.string().max(500).optional().nullable(),
  googleCalendarLinked: z.boolean().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  teamId: z.string().min(1).optional().nullable(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(64),
  payload: z.object({
    title: z.string().min(1).max(256),
    description: z.string().max(5000).optional().nullable(),
    importance: z.enum(['low', 'medium', 'high']).optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
    weight: z.enum(['light', 'normal', 'heavy']).optional(),
    dueType: z.enum(['none', 'datetime', 'anytime', 'flexible']).optional(),
    repeatType: z.enum(['none', 'fixed', 'flexible']).optional(),
    categoryName: z.string().optional().nullable(),
  }),
});

export const createHabitSchema = z.object({
  title: z.string().min(1).max(128),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  color: z.string().max(32).optional().nullable(),
});

export const habitLogSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const suggestSubtasksSchema = z.object({
  title: z.string().min(1).max(256),
});
