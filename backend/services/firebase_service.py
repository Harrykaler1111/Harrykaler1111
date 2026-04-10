import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
# For token verification, we only need the project ID
if not firebase_admin._apps:
    try:
        firebase_admin.initialize_app(options={"projectId": "pigma-d4be0"})
        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Firebase Admin SDK initialization failed: {e}")


def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return {
            "success": True,
            "uid": decoded.get("uid"),
            "phone_number": decoded.get("phone_number"),
            "firebase_data": decoded,
        }
    except firebase_auth.ExpiredIdTokenError:
        return {"success": False, "error": "Token expired"}
    except firebase_auth.InvalidIdTokenError:
        return {"success": False, "error": "Invalid token"}
    except firebase_auth.RevokedIdTokenError:
        return {"success": False, "error": "Token revoked"}
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}")
        return {"success": False, "error": str(e)}
