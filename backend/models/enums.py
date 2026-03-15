from enum import Enum


class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    MARKETING_MANAGER = "marketing_manager"
    FINANCE_MANAGER = "finance_manager"
    SUPPORT_MANAGER = "support_manager"


class WithdrawalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"


class TransactionType(str, Enum):
    COMMISSION = "commission"
    WITHDRAWAL = "withdrawal"
    ADJUSTMENT = "adjustment"
    BONUS = "bonus"


ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: {
        "products": ["view", "create", "edit", "delete"],
        "orders": ["view", "update", "delete"],
        "influencers": ["view", "approve", "reject", "edit", "delete"],
        "affiliates": ["view", "approve", "reject", "edit", "delete"],
        "commissions": ["view", "edit", "approve"],
        "wallets": ["view", "edit", "approve_withdrawal"],
        "payouts": ["view", "create", "approve", "process"],
        "analytics": ["view", "export"],
        "admin_users": ["view", "create", "edit", "delete"],
        "system": ["view", "configure"],
        "customers": ["view", "edit", "delete"],
        "coupons": ["view", "create", "edit", "delete"],
    },
    AdminRole.MARKETING_MANAGER: {
        "products": ["view"],
        "orders": ["view"],
        "influencers": ["view", "approve", "reject"],
        "affiliates": ["view", "approve", "reject"],
        "commissions": ["view"],
        "wallets": ["view"],
        "payouts": [],
        "analytics": ["view"],
        "admin_users": [],
        "system": [],
        "customers": ["view"],
        "coupons": ["view", "create", "edit"],
    },
    AdminRole.FINANCE_MANAGER: {
        "products": ["view"],
        "orders": ["view"],
        "influencers": ["view"],
        "affiliates": ["view"],
        "commissions": ["view", "edit"],
        "wallets": ["view", "approve_withdrawal"],
        "payouts": ["view", "create", "approve", "process"],
        "analytics": ["view", "export"],
        "admin_users": [],
        "system": [],
        "customers": ["view"],
        "coupons": ["view"],
    },
    AdminRole.SUPPORT_MANAGER: {
        "products": ["view"],
        "orders": ["view", "update"],
        "influencers": ["view"],
        "affiliates": ["view"],
        "commissions": [],
        "wallets": [],
        "payouts": [],
        "analytics": ["view"],
        "admin_users": [],
        "system": [],
        "customers": ["view", "edit"],
        "coupons": ["view"],
    },
}
