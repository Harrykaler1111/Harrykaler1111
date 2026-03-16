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

# Razorpay client (MOCKED)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_placeholder')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'placeholder_secret')

# Instagram OAuth (MOCKED)
INSTAGRAM_APP_ID = os.environ.get('INSTAGRAM_APP_ID', 'mock_app_id')
INSTAGRAM_APP_SECRET = os.environ.get('INSTAGRAM_APP_SECRET', 'mock_app_secret')
INSTAGRAM_REDIRECT_URI = os.environ.get('INSTAGRAM_REDIRECT_URI', '')

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
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / 'kyc').mkdir(exist_ok=True)
(UPLOAD_DIR / 'products').mkdir(exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Rate limiting for DM automation
DM_RATE_LIMIT_PER_HOUR = 50
DM_RATE_LIMIT_PER_DAY = 200
