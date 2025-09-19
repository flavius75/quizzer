from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.quizzes import router as quizzes_router
from app.helpers.logger import setup_logging
import uvicorn

setup_logging()

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1/",
    "http://127.0.0.1:5173",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1/",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(quizzes_router, prefix="/quizzes", tags=["Quizzes"])


@app.get("/hello")
def hello():
    return {"message": "Hello"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)