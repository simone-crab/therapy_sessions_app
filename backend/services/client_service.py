from sqlalchemy.orm import Session
from backend.models.client import Client, ClientStatus
from backend.schemas.client import ClientCreate, ClientUpdate
from typing import List, Optional

class ClientService:

    @staticmethod
    def get_clients(db: Session, include_archived: bool = False) -> List[Client]:
        query = db.query(Client)
        if not include_archived:
            query = query.filter(Client.status == ClientStatus.ACTIVE)
        return query.order_by(Client.first_name, Client.last_name).all()

    @staticmethod
    def get_client_by_id(db: Session, client_id: int) -> Optional[Client]:
        return db.query(Client).filter(Client.id == client_id).first()

    @staticmethod
    def create_client(db: Session, client: ClientCreate) -> Client:
        db_client = Client(**client.dict())
        db.add(db_client)
        db.commit()
        db.refresh(db_client)
        return db_client

    @staticmethod
    def update_client(db: Session, client_id: int, update_data: ClientUpdate) -> Optional[Client]:
        db_client = db.query(Client).filter(Client.id == client_id).first()
        if db_client:
            for field, value in update_data.dict(exclude_unset=True).items():
                setattr(db_client, field, value)
            db.commit()
            db.refresh(db_client)
        return db_client

    @staticmethod
    def archive_client(db: Session, client_id: int) -> Optional[Client]:
        db_client = db.query(Client).filter(Client.id == client_id).first()
        if db_client:
            db_client.status = ClientStatus.ARCHIVED
            db.commit()
            db.refresh(db_client)
        return db_client

    @staticmethod
    def delete_client(db: Session, client_id: int) -> bool:
        db_client = db.query(Client).filter(Client.id == client_id).first()
        if db_client:
            db.delete(db_client)
            db.commit()
            return True
        return False
