from sqlalchemy import create_engine, text
import os

# Database URL
DATABASE_URL = "sqlite:///./data/therapy.db"

def run_migration():
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Create a connection
    with engine.connect() as connection:
        # Start a transaction
        with connection.begin():
            # Update the status column to use the correct enum values
            connection.execute(text("""
                UPDATE clients 
                SET status = CASE 
                    WHEN status = 'active' THEN 'active'
                    WHEN status = 'archived' THEN 'archived'
                    ELSE 'active'
                END
            """))
            
            # Recreate the status column with the correct type
            connection.execute(text("""
                CREATE TABLE clients_new (
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    status VARCHAR(8) CHECK(status IN ('active', 'archived')),
                    id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    date_of_birth DATE,
                    initial_assessment_date DATE,
                    address1 VARCHAR(255),
                    address2 VARCHAR(255),
                    city VARCHAR(100),
                    postcode VARCHAR(20),
                    emergency_contact_name VARCHAR(100),
                    emergency_contact_relationship VARCHAR(100),
                    emergency_contact_phone VARCHAR(50),
                    gp_name VARCHAR(100),
                    gp_practice VARCHAR(255),
                    gp_phone VARCHAR(50),
                    PRIMARY KEY (id)
                )
            """))
            
            # Copy data from old table to new table
            connection.execute(text("""
                INSERT INTO clients_new 
                SELECT * FROM clients
            """))
            
            # Drop old table
            connection.execute(text("DROP TABLE clients"))
            
            # Rename new table to old table name
            connection.execute(text("ALTER TABLE clients_new RENAME TO clients"))

if __name__ == "__main__":
    run_migration() 