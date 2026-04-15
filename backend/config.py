from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')

import razorpay
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Instagram OAuth (Real Meta Graph API)
INSTAGRAM_APP_ID = os.environ.get('META_APP_ID', '')
INSTAGRAM_APP_SECRET = os.environ.get('META_APP_SECRET', '')
INSTAGRAM_REDIRECT_URI = os.environ.get('INSTAGRAM_REDIRECT_URI', 'https://thepigma.com/api/instagram/auth/callback')

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'pigma-super-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7
ADMIN_JWT_EXPIRATION_HOURS = 8

# Commission settings
DEFAULT_COMMISSION_RATE = 10.0
PLATFORM_COMMISSION_RATE = 15.0
MIN_WITHDRAWAL_AMOUNT = 1000

# Upload settings
UPLOAD_DIR = ROOT_DIR / 'uploads'
try:
    UPLOAD_DIR.mkdir(exist_ok=True)
    (UPLOAD_DIR / 'kyc').mkdir(exist_ok=True)
    (UPLOAD_DIR / 'products').mkdir(exist_ok=True)
except OSError:
    # In read-only containers, fall back to /tmp
    UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/tmp/pigma_uploads'))
    UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Rate limiting for DM automation
DM_RATE_LIMIT_PER_HOUR = 50
DM_RATE_LIMIT_PER_DAY = 200
