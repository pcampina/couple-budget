export interface TransactionType { code: string; name: string }

export interface GroupMember { id: string; name: string; email: string | null; accepted: boolean }

export interface TransactionLike { type?: string; type_code?: string }

