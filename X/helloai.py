from fastapi import FastAPI, Depends, HTTPException, status, Request, Form, Cookie
from fastapi.responses import RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, create_engine
# from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from passlib.context import CryptContext
import jwt as pyjwt  # Use PyJWT with alias to avoid conflicts
from datetime import datetime, timedelta
import os
import logging
import secrets



# Initialize FastAPI app
app = FastAPI()

# Configure Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency for getting the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions
def get_user_by_email(db: Session, email: str):
    logger.info(f"Getting user by email: {email}")
    user = db.query(User).filter(User.email == email).first()
    logger.info(f"User found: {user}")
    return user

def create_user(db: Session, email: str, password: str):
    logger.info(f"Creating user with email: {email}")
    hashed_password = pwd_context.hash(password)
    new_user = User(email=email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"User created with ID: {new_user.id}")
    return new_user

def verify_password(plain_password, hashed_password):
    logger.info(f"Verifying password")
    result = pwd_context.verify(plain_password, hashed_password)
    logger.info(f"Password verification result: {result}")
    return result

def create_access_token(data: dict, expires_delta: timedelta = None):
    logger.info(f"Creating access token for data: {data}")
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"Access token created: {encoded_jwt}")
    return encoded_jwt

# Routes
@app.get("/")
async def read_root(request: Request):
    logger.info("GET / - Rendering index page")
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/register")
async def register_get(request: Request):
    logger.info("GET /register - Rendering register page")
    return templates.TemplateResponse("register.html", {"request": request})

@app.post("/register")
async def register_post(request: Request, db: Session = Depends(get_db), email: str = Form(...), password: str = Form(...)):
    logger.info(f"POST /register - Registering user with email: {email}")
    if get_user_by_email(db, email):
        logger.info(f"User with email {email} already exists")
        return templates.TemplateResponse("register.html", {"request": request, "error": "User already exists"})
    create_user(db, email, password)
    logger.info(f"User with email {email} successfully registered")
    return RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)

@app.get("/login")
async def login_get(request: Request):
    logger.info("GET /login - Rendering login page")
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/token")
async def login_for_access_token(response: Response, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"POST /token - Logging in user: {form_data.username}")
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.info("Invalid credentials provided")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    
    # Set the token as a cookie in the response
    response.set_cookie(
        key="access_token", 
        value=f"Bearer {access_token}", 
        httponly=True,
        samesite='Lax',
        secure=False  # Set to True if using HTTPS
    )
    logger.info(f"Access token set in cookie for user: {user.email}")
    
    # Redirect the user to the dashboard
    return RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)

@app.get("/dashboard")
async def dashboard(request: Request, access_token: str = Cookie(None)):
    logger.info("GET /dashboard - Accessing dashboard")
    logger.info(f"The content of the token={access_token}")
    if access_token is None:
        logger.info("No access token found in cookies")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    try:
        token_data = access_token.split(" ")[1]  # Remove "Bearer" prefix
        payload = pyjwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"The payload token={payload}")
        email = payload.get("sub")
        if email is None:
            logger.info("Invalid token payload: missing 'sub'")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        logger.info(f"Token valid for user: {email}")
    except pyjwt.PyJWTError:
        logger.info("Invalid token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    return templates.TemplateResponse("dashboard.html", {"request": request, "email": email})

# Run using Uvicorn
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server")
    uvicorn.run("helloai:app", host="127.0.0.1", port=8000, reload=True)