"""
AI-powered KYC Document Verification Service
Uses Gemini Flash to OCR and validate uploaded KYC documents.
Extracts text from PAN, Aadhaar, MSME certificates and cross-checks against vendor-submitted data.
"""

import os
import base64
import logging
import uuid
import json as json_module
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Document-specific extraction prompts
DOC_PROMPTS = {
    "pan_card": """Analyze this PAN card image. Extract:
1. PAN Number (10 character alphanumeric, format: ABCDE1234F)
2. Full Name on card
3. Father's Name (if visible)
4. Date of Birth (if visible)

Return ONLY a JSON object like:
{"pan_number": "XXXXX0000X", "name": "FULL NAME", "fathers_name": "NAME OR empty", "dob": "DD/MM/YYYY OR empty", "is_valid_document": true/false, "confidence": "high/medium/low", "issues": ["list of any issues like blurry, tampered, partial"]}

If the image is NOT a PAN card or is unreadable, set is_valid_document to false.""",

    "aadhaar_front": """Analyze this Aadhaar card FRONT side image. Extract:
1. Aadhaar Number (12 digits, may be in format XXXX XXXX XXXX)
2. Full Name
3. Date of Birth
4. Gender

Return ONLY a JSON object like:
{"aadhaar_number": "123456789012", "name": "FULL NAME", "dob": "DD/MM/YYYY OR empty", "gender": "Male/Female/Other OR empty", "is_valid_document": true/false, "confidence": "high/medium/low", "issues": ["list of any issues"]}

If the image is NOT an Aadhaar card front or is unreadable, set is_valid_document to false.""",

    "aadhaar_back": """Analyze this Aadhaar card BACK side image. Extract:
1. Address (if visible)
2. Any QR code present (yes/no)

Return ONLY a JSON object like:
{"address": "extracted address or empty", "has_qr_code": true/false, "is_valid_document": true/false, "confidence": "high/medium/low", "issues": ["list of any issues"]}

If the image is NOT an Aadhaar card back or is unreadable, set is_valid_document to false.""",

    "msme_certificate": """Analyze this MSME/Udyam Registration Certificate image. Extract:
1. Udyam Registration Number (format: UDYAM-XX-00-0000000)
2. Enterprise Name
3. Type of Enterprise (Micro/Small/Medium)
4. Date of Registration

Return ONLY a JSON object like:
{"udyam_number": "UDYAM-XX-00-0000000", "enterprise_name": "NAME", "enterprise_type": "Micro/Small/Medium", "registration_date": "DD/MM/YYYY OR empty", "is_valid_document": true/false, "confidence": "high/medium/low", "issues": ["list of any issues"]}

If the image is NOT an MSME/Udyam certificate or is unreadable, set is_valid_document to false.""",

    "gst_certificate": """Analyze this GST Registration Certificate image. Extract:
1. GSTIN (15 character alphanumeric)
2. Legal Name
3. Trade Name
4. Date of Registration

Return ONLY a JSON object like:
{"gstin": "22AAAAA0000A1Z5", "legal_name": "NAME", "trade_name": "NAME OR empty", "registration_date": "DD/MM/YYYY OR empty", "is_valid_document": true/false, "confidence": "high/medium/low", "issues": ["list of any issues"]}

If the image is NOT a GST certificate or is unreadable, set is_valid_document to false.""",

    "bank_proof": """Analyze this bank document (cancelled cheque or passbook page). Extract:
1. Account Number
2. IFSC Code
3. Account Holder Name
4. Bank Name

Return ONLY a JSON object like:
{"account_number": "NUMBER", "ifsc": "IFSC CODE", "account_name": "NAME", "bank_name": "BANK NAME", "is_valid_document": true/false, "confidence": "high/medium/low", "issues": ["list of any issues"]}

If the image is NOT a bank document or is unreadable, set is_valid_document to false.""",
}


async def verify_kyc_document(doc_type: str, file_bytes: bytes, content_type: str, vendor_data: dict = None) -> dict:
    """
    Use AI to OCR and validate a KYC document.
    Returns extracted data, validation result, and any mismatches.
    """
    if not EMERGENT_KEY:
        logger.warning("No EMERGENT_LLM_KEY configured, skipping AI verification")
        return {"verified": False, "skipped": True, "reason": "AI verification not configured"}

    prompt = DOC_PROMPTS.get(doc_type)
    if not prompt:
        return {"verified": False, "skipped": True, "reason": f"No verification prompt for {doc_type}"}

    # Only process images, skip PDFs
    if content_type == "application/pdf":
        return {"verified": False, "skipped": True, "reason": "PDF documents require manual review"}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        image_b64 = base64.b64encode(file_bytes).decode("utf-8")

        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"kyc-verify-{uuid.uuid4().hex[:8]}",
            system_message="You are a KYC document verification specialist. Extract data from Indian identity documents accurately. Always respond with valid JSON only, no markdown formatting."
        ).with_model("openai", "gpt-4o-mini")

        image_content = ImageContent(image_base64=image_b64)

        user_msg = UserMessage(
            text=prompt,
            file_contents=[image_content]
        )

        response_text = await chat.send_message(user_msg)
        logger.info(f"AI KYC verification response for {doc_type}: {response_text[:200]}")

        # Parse AI response
        # Clean response - strip markdown code blocks if present
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        extracted = json_module.loads(cleaned)

        # Cross-check against vendor-submitted data
        mismatches = []
        if vendor_data:
            if doc_type == "pan_card" and extracted.get("pan_number"):
                submitted_pan = vendor_data.get("pan_number", "").upper().strip()
                extracted_pan = extracted["pan_number"].upper().strip().replace(" ", "")
                if submitted_pan and extracted_pan and submitted_pan != extracted_pan:
                    mismatches.append(f"PAN mismatch: submitted '{submitted_pan}' vs document '{extracted_pan}'")

            if doc_type == "aadhaar_front" and extracted.get("aadhaar_number"):
                submitted_aadhaar = vendor_data.get("aadhaar_number", "").replace(" ", "").strip()
                extracted_aadhaar = extracted["aadhaar_number"].replace(" ", "").strip()
                if submitted_aadhaar and extracted_aadhaar and submitted_aadhaar != extracted_aadhaar:
                    mismatches.append(f"Aadhaar mismatch: submitted '{submitted_aadhaar[-4:]}' vs document '{extracted_aadhaar[-4:]}'")

            if doc_type == "msme_certificate" and extracted.get("udyam_number"):
                submitted_msme = vendor_data.get("msme_registration", "").upper().strip()
                extracted_msme = extracted["udyam_number"].upper().strip()
                if submitted_msme and extracted_msme and submitted_msme != extracted_msme:
                    mismatches.append(f"MSME mismatch: submitted '{submitted_msme}' vs document '{extracted_msme}'")

            if doc_type == "gst_certificate" and extracted.get("gstin"):
                submitted_gst = vendor_data.get("gst_number", "").upper().strip()
                extracted_gst = extracted["gstin"].upper().strip()
                if submitted_gst and extracted_gst and submitted_gst != extracted_gst:
                    mismatches.append(f"GST mismatch: submitted '{submitted_gst}' vs document '{extracted_gst}'")

        is_valid = extracted.get("is_valid_document", False)
        confidence = extracted.get("confidence", "low")
        issues = extracted.get("issues", [])

        # Determine verification status
        if not is_valid:
            status = "invalid_document"
            recommendation = "REJECT — Document does not appear to be a valid " + doc_type.replace("_", " ").title()
        elif mismatches:
            status = "mismatch_detected"
            recommendation = "REVIEW — " + "; ".join(mismatches)
        elif confidence == "low":
            status = "low_confidence"
            recommendation = "REVIEW — Low confidence in extraction, document may be unclear"
        elif issues:
            status = "has_issues"
            recommendation = "REVIEW — " + "; ".join(issues)
        else:
            status = "verified"
            recommendation = "APPROVE — Document verified, data matches"

        return {
            "verified": status == "verified",
            "skipped": False,
            "status": status,
            "confidence": confidence,
            "extracted_data": extracted,
            "mismatches": mismatches,
            "issues": issues,
            "recommendation": recommendation,
        }

    except json_module.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response for {doc_type}: {e}")
        return {"verified": False, "skipped": False, "status": "parse_error", "recommendation": "REVIEW — AI could not parse document clearly"}
    except Exception as e:
        logger.error(f"AI KYC verification failed for {doc_type}: {e}")
        return {"verified": False, "skipped": True, "reason": f"AI verification error: {str(e)}"}
