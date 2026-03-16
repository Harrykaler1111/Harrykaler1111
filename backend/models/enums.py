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
    PLATFORM_FEE = "platform_fee"
    SALE_CREDIT = "sale_credit"
    INFLUENCER_COMMISSION = "influencer_commission"


class VendorStatus(str, Enum):
    PENDING = "pending"
    KYC_SUBMITTED = "kyc_submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class VendorProductStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELISTED = "delisted"


class KYCDocumentType(str, Enum):
    PAN_CARD = "pan_card"
    AADHAAR_CARD = "aadhaar_card"
    BANK_PROOF = "bank_proof"
    CANCELLED_CHEQUE = "cancelled_cheque"


ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: {
        "products": ["view", "create", "edit", "delete", "approve"],
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
        "vendors": ["view", "approve", "reject", "edit", "delete", "suspend"],
        "vendor_products": ["view", "approve", "reject"],
        "vendor_kyc": ["view", "approve", "reject"],
        "vendor_withdrawals": ["view", "approve", "reject", "process"],
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
        "vendors": ["view"],
        "vendor_products": ["view"],
        "vendor_kyc": [],
        "vendor_withdrawals": [],
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
        "vendors": ["view"],
        "vendor_products": ["view"],
        "vendor_kyc": ["view", "approve", "reject"],
        "vendor_withdrawals": ["view", "approve", "reject", "process"],
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
        "vendors": ["view"],
        "vendor_products": ["view"],
        "vendor_kyc": [],
        "vendor_withdrawals": [],
    },
}
