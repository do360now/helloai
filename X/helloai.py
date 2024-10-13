from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
import jwt as pyjwt  # Use PyJWT with alias to avoid conflicts
from datetime import datetime, timedelta
import os

# Initialize FastAPI app
app = FastAPI()

# Configure Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Database configuration
DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT settings
SECRET_KEY = "your_secret_key"
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
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, email: str, password: str):
    hashed_password = pwd_context.hash(password)
    new_user = User(email=email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Routes
@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/register")
async def register_get(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.post("/register")
async def register_post(request: Request, db: Session = Depends(get_db), email: str = Form(...), password: str = Form(...)):
    if get_user_by_email(db, email):
        return templates.TemplateResponse("register.html", {"request": request, "error": "User already exists"})
    create_user(db, email, password)
    return RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)

@app.get("/login")
async def login_get(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

from fastapi.responses import RedirectResponse, Response

@app.post("/token")
async def login_for_access_token(response: Response, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    
    # Set the token as a cookie in the response
    response.set_cookie(key="access_token", value=f"Bearer {access_token}", httponly=True)
    
    # Redirect the user to the dashboard
    return RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)


from fastapi import Cookie

# In the /token route
@app.post("/token")
async def login_for_access_token(response: Response, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
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
    
    # Redirect the user to the dashboard
    return RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)


# Run using Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("helloai:app", host="127.0.0.1", port=8000, reload=True)
