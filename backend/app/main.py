from fastapi import FastAPI, Depends, HTTPException
from psycopg import Connection

from app.database import get_connection

from app.schemas import ProductCreate, ProductResponse, ProductUpdate, InventoryItemResponse

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


@app.get("/products", response_model=list[ProductResponse])
def get_products(connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """SELECT id, name, unit, created_at, is_active
            FROM products
            WHERE is_active = TRUE
            ORDER BY id;"""
        )
        products = cursor.fetchall()

    products_response = []
    for p in products:
        product_data = {
            "id": p[0],
            "name": p[1],
            "unit": p[2],
            "created_at": p[3],
            "is_active": p[4]
        }
        products_response.append(product_data)

    return products_response


@app.post("/products", status_code=201, response_model=ProductResponse)
def create_product(product: ProductCreate, connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO products (name, unit)
            VALUES (%s, %s)
            RETURNING id, name, unit, is_active, created_at""",
            (product.name, product.unit)
        )

        created_product = cursor.fetchone()
        connection.commit()
    
    return {
        "id": created_product[0],
        "name": created_product[1],
        "unit": created_product[2],
        "is_active": created_product[3],
        "created_at": created_product[4],
    }


@app.get("/products/{product_id}", response_model=ProductResponse)
def show_product(product_id: int, connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, name, unit, is_active, created_at
            FROM products
            WHERE id = %s AND is_active =TRUE
            """,
            (product_id,)
        )

        product = cursor.fetchone()

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "id": product[0],
        "name": product[1],
        "unit": product[2],
        "is_active": product[3],
        "created_at": product[4],
    }


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE products
            SET name = %s, unit = %s
            WHERE id = %s AND is_active = TRUE
            RETURNING id, name, unit, is_active, created_at
            """,
            (product.name, product.unit, product_id)
        )

        product_updated = cursor.fetchone()

    if product_updated is None:
        raise HTTPException(status_code=404, detail="Product not found")

    connection.commit()

    return {
        "id": product_updated[0],
        "name": product_updated[1],
        "unit": product_updated[2],
        "is_active": product_updated[3],
        "created_at": product_updated[4],
    }


@app.post("/products/{product_id}/archive", response_model=ProductResponse)
def archive_product(product_id: int, connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE products
            SET is_active = FALSE
            WHERE id = %s
            RETURNING id, name, unit, is_active, created_at
            """,
            (product_id,)
        )

        product_updated = cursor.fetchone()

    if product_updated is None:
        raise HTTPException(status_code=404, detail="Product not found")

    connection.commit()

    return {
        "id": product_updated[0],
        "name": product_updated[1],
        "unit": product_updated[2],
        "is_active": product_updated[3],
        "created_at": product_updated[4],
    }


@app.post("/products/{product_id}/restore", response_model=ProductResponse)
def restore_product(product_id: int, connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE products
            SET is_active = TRUE
            WHERE id = %s
            RETURNING id, name, unit, is_active, created_at
            """,
            (product_id,)
        )

        product_updated = cursor.fetchone()

    if product_updated is None:
        raise HTTPException(status_code=404, detail="Product not found")

    connection.commit()

    return {
        "id": product_updated[0],
        "name": product_updated[1],
        "unit": product_updated[2],
        "is_active": product_updated[3],
        "created_at": product_updated[4],
    }


@app.get("/inventory", response_model=list[InventoryItemResponse])
def get_inventory(connection: Connection = Depends(get_connection)):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                i.id AS inventory_item_id,
                p.id AS product_id,
                p.name,
                p.unit,
                i.location,
                i.quantity
            FROM inventory_items AS i
            INNER JOIN products AS p
                ON i.product_id = p.id
            WHERE p.is_active = TRUE
            ORDER BY i.id
            """
        )

        inventory = cursor.fetchall()

    inventory_response = []
    
    for p in inventory:
        product_data = {
            "inventory_item_id": p[0],
            "product_id": p[1],
            "name": p[2],
            "unit": p[3],
            "location": p[4],
            "quantity": p[5]
        }
        inventory_response.append(product_data)

    return inventory_response