import os
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API") 
CLERK_JWKS_URL = f"{CLERK_FRONTEND_API}/.well-known/jwks.json"

_jwks_cache = None

async def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            response = await client.get(CLERK_JWKS_URL)
            _jwks_cache = response.json()
    return _jwks_cache

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not CLERK_FRONTEND_API:
        print("CRITICAL: CLERK_FRONTEND_API not found in .env")
        raise HTTPException(status_code=500, detail="Server configuration error")

    try:
        jwks = await get_jwks()
        
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        return user_id
        
    except JWTError as e:
        print(f"Auth Error: {str(e)}")
        global _jwks_cache
        _jwks_cache = None
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected Auth Error: {str(e)}")
        raise credentials_exception
