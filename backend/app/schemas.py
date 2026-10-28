from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from decimal import Decimal
from typing import Literal


class ProductCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=30)

class ProductResponse(BaseModel):
    id: int
    name: str
    unit: str
    is_active: bool
    created_at: datetime

class ProductUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=30)

class InventoryItemResponse(BaseModel):
    inventory_item_id: int
    product_id: int
    name: str
    unit: str
    location: Literal["fridge", "freezer", "pantry"]
    quantity: Decimal