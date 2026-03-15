from fastapi import APIRouter, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from models.schemas import ChatMessage, ChatResponse
from auth import get_optional_user, generate_id

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_with_ai(message: ChatMessage, user: Optional[Dict] = Depends(get_optional_user)):
    session_id = message.session_id or generate_id("chat_")

    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_id": user["user_id"] if user else None,
        "role": "user",
        "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    responses = {
        "shipping": "We offer free shipping on orders over Rs. 2999! Standard delivery takes 5-7 business days.",
        "return": "You can return unworn items within 14 days of delivery for a full refund.",
        "size": "Our boots run true to size. Check our size guide for detailed measurements.",
        "payment": "We accept all major credit cards, UPI, and net banking through Razorpay.",
        "influencer": "Become a Pigma influencer! Sign up, get approved, and earn 10% commission on all sales through your referral link.",
        "commission": "Approved influencers earn 10% commission on every sale. Minimum withdrawal is Rs. 1000.",
        "default": "Thank you for reaching out to Pigma! How can I help you with your luxury boot shopping experience today?"
    }

    response_text = responses["default"]
    msg_lower = message.message.lower()
    for key, value in responses.items():
        if key in msg_lower:
            response_text = value
            break

    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_id": user["user_id"] if user else None,
        "role": "assistant",
        "content": response_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return ChatResponse(response=response_text, session_id=session_id)


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    messages = await db.chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return messages
