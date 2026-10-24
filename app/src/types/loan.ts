export interface Loan {
  id: string;
  userId: string;
  friendName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'REPAID';
  isOverdue: boolean;
  repaidAt: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface Summary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  outstanding: number;
  counts: {
    total: number;
    repaid: number;
    overdue: number;
  };
}
