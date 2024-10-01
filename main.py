from fastapi import FastAPI

app = FastAPI()

# A simple route that returns a welcome message
@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI!"}

# A route that takes a 'name' parameter and returns a greeting message
@app.get("/greet/{name}")
def greet_name(name: str):
    return {"greeting": f"Hello, {name}!"}

# A route with query parameters
@app.get("/items/")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

