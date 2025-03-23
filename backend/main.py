from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.quizzes import router as quizzes_router

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1/",
    "http://127.0.0.1:8000",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1/",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(quizzes_router, prefix="/quizzes", tags=["Quizzes"])


@app.get("/hello")
def hello() :
    return {"message": "Hello"}





