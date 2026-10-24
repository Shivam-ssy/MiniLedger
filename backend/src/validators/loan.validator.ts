import { z } from 'zod';
import { getUtcTodayDate, parseUtcDateOnly } from '../utils/date.util';

export const createLoanSchema = z.object({
  friendName: z
    .string({ required_error: 'Friend name is required' })
    .trim()
    .min(1, 'Friend name cannot be empty')
    .max(100, 'Friend name cannot exceed 100 characters'),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(10000000, 'Amount cannot exceed 10,000,000')
    .refine(
      (val) => {
        // Ensure max 2 decimal places
        const parts = val.toString().split('.');
        return parts.length < 2 || (parts[1] !== undefined && parts[1].length <= 2);
      },
      { message: 'Amount cannot have more than 2 decimal places' },
    ),
  dueDate: z
    .string({ required_error: 'Due date is required' })
    .refine(
      (val) => {
        try {
          const parsed = parseUtcDateOnly(val);
          return !isNaN(parsed.getTime());
        } catch {
          return false;
        }
      },
      { message: 'Due date must be a valid ISO date string' },
    )
    .refine(
      (val) => {
        const parsed = parseUtcDateOnly(val);
        const today = getUtcTodayDate();
        return parsed.getTime() >= today.getTime();
      },
      { message: 'Due date cannot be before today' },
    ),
});

export const loanQuerySchema = z.object({
  status: z.enum(['PENDING', 'REPAID']).optional(),
  overdue: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const loanIdParamSchema = z.object({
  id: z.string().uuid('Invalid loan ID format. Must be a valid UUID.'),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type LoanQueryInput = z.infer<typeof loanQuerySchema>;
