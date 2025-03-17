from fastapi import FastAPI
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.quizzes import router as quizzes_router

app = FastAPI()

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(quizzes_router, prefix="/quizzes", tags=["Quizzes"])


@app.get("/hello")
def hello() :
    return {"message": "Hello"}





