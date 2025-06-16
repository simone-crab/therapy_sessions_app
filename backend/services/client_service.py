from sqlalchemy.orm import Session
from backend.models.client import Client, ClientStatus
from backend.schemas.client import ClientCreate, ClientUpdate
from typing import List, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClientService:

    @staticmethod
    def get_clients(db: Session, filter: str = "active") -> List[Client]:
        query = db.query(Client)
        if filter == "active":
            query = query.filter(Client.status == ClientStatus.ACTIVE)
        elif filter == "archived":
            query = query.filter(Client.status == ClientStatus.ARCHIVED)
        # if filter == "all", do not apply any filter
        return query.order_by(Client.first_name, Client.last_name).all()

    @staticmethod
    def get_client_by_id(db: Session, client_id: int) -> Optional[Client]:
        return db.query(Client).filter(Client.id == client_id).first()

    @staticmethod
    def create_client(db: Session, client: ClientCreate) -> Client:
        try:
            logger.info(f"Creating new client: {client.dict()}")
            # Create a new client instance without specifying an ID
            db_client = Client(
                first_name=client.first_name,
                last_name=client.last_name,
                email=client.email,
                phone=client.phone,
                date_of_birth=client.date_of_birth,
                initial_assessment_date=client.initial_assessment_date,
                address1=client.address1,
                address2=client.address2,
                city=client.city,
                postcode=client.postcode,
                emergency_contact_name=client.emergency_contact_name,
                emergency_contact_relationship=client.emergency_contact_relationship,
                emergency_contact_phone=client.emergency_contact_phone,
                gp_name=client.gp_name,
                gp_practice=client.gp_practice,
                gp_phone=client.gp_phone,
                status=ClientStatus.ACTIVE
            )
            db.add(db_client)
            db.commit()
            db.refresh(db_client)
            logger.info(f"Successfully created client with ID: {db_client.id}")
            return db_client
        except Exception as e:
            logger.error(f"Error creating client: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def update_client(db: Session, client_id: int, update_data: ClientUpdate) -> Optional[Client]:
        try:
            logger.info(f"Updating client {client_id} with data: {update_data.dict(exclude_unset=True)}")
            db_client = db.query(Client).filter(Client.id == client_id).first()
            if db_client:
                # Only update fields that are provided in the update data
                update_dict = update_data.dict(exclude_unset=True)
                for field, value in update_dict.items():
                    if field != 'id':  # Never update the ID
                        setattr(db_client, field, value)
                db.commit()
                db.refresh(db_client)
                logger.info(f"Successfully updated client {client_id}")
                return db_client
            logger.warning(f"Client {client_id} not found for update")
            return None
        except Exception as e:
            logger.error(f"Error updating client {client_id}: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def set_archive_status(db: Session, client_id: int, archive: bool) -> Optional[Client]:
        try:
            logger.info(f"Setting archive status for client {client_id} to {archive}")
            db_client = db.query(Client).filter(Client.id == client_id).first()
            if db_client:
                db_client.status = ClientStatus.ARCHIVED if archive else ClientStatus.ACTIVE
                db.commit()
                db.refresh(db_client)
                logger.info(f"Successfully updated archive status for client {client_id}")
                return db_client
            logger.warning(f"Client {client_id} not found for archive status update")
            return None
        except Exception as e:
            logger.error(f"Error updating archive status for client {client_id}: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def delete_client(db: Session, client_id: int) -> bool:
        try:
            logger.info(f"Deleting client {client_id}")
            db_client = db.query(Client).filter(Client.id == client_id).first()
            if db_client:
                db.delete(db_client)  # will cascade due to relationships
                db.commit()
                logger.info(f"Successfully deleted client {client_id}")
                return True
            logger.warning(f"Client {client_id} not found for deletion")
            return False
        except Exception as e:
            logger.error(f"Error deleting client {client_id}: {str(e)}")
            db.rollback()
            raise
