CREATE TABLE IF NOT EXISTS products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    location VARCHAR(30) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,

    CONSTRAINT chk_location
        CHECK (location IN ('fridge', 'freezer', 'pantry')),

    CONSTRAINT chk_quantity
        CHECK (quantity >= 0),

    CONSTRAINT uq_product_location
        UNIQUE (product_id, location)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id),
    type VARCHAR(20) NOT NULL,
    quantity_change NUMERIC(12, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_movement_type
        CHECK (type IN (
            'entry',
            'consumption',
            'waste',
            'adjustment',
            'transfer_in',
            'transfer_out'
        )),

    CONSTRAINT chk_quantity_change
        CHECK (quantity_change <> 0)
);