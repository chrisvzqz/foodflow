from fastapi import FastAPI, Depends
from psycopg import Connection

from app.database import get_connection

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Welcome to FoodFlow"}


@app.get("/health/db")
def check_database(connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()

    return {"database": "connected", "result": result[0]}