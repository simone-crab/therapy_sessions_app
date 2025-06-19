"""
Service layer for client-related operations.

This module provides business logic functions for managing clients,
such as retrieving, creating, updating, and deleting client records,
as well as managing their archive status. It interacts with the
database session and uses SQLAlchemy models and Pydantic schemas.
"""
from sqlalchemy.orm import Session
from backend.models.client import Client, ClientStatus
from backend.schemas.client import ClientCreate, ClientUpdate
from typing import List, Optional
import logging
from backend import constants # Import constants

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClientService:
    """Provides all business logic for client management."""

    @staticmethod
    def get_clients(db: Session, filter: str = "active") -> List[Client]:
        """
        Retrieves a list of clients based on the specified filter.

        Args:
            db: The database session.
            filter: A string indicating how to filter clients.
                "active" (default): Returns only active clients.
                "archived": Returns only archived clients.
                "all": Returns all clients.

        Returns:
            A list of Client model instances.
        """
        query = db.query(Client)
        if filter == "active":
            query = query.filter(Client.status == ClientStatus.ACTIVE)
        elif filter == "archived":
            query = query.filter(Client.status == ClientStatus.ARCHIVED)
        # if filter == "all", do not apply any filter
        return query.order_by(Client.first_name, Client.last_name).all()

    @staticmethod
    def get_client_by_id(db: Session, client_id: int) -> Optional[Client]:
        """
        Retrieves a single client by their ID.

        Args:
            db: The database session.
            client_id: The ID of the client to retrieve.

        Returns:
            The Client model instance if found, otherwise None.
        """
        return db.query(Client).filter(Client.id == client_id).first()

    @staticmethod
    def create_client(db: Session, client: ClientCreate) -> Client:
        """
        Creates a new client.

        Args:
            db: The database session.
            client: A ClientCreate schema object with the new client's data.

        Returns:
            The newly created Client model instance.

        Raises:
            Exception: If there's an error during client creation.
        """
        try:
            # Using .model_dump() as .dict() is deprecated in Pydantic v2
            logger.info(f"Creating new client: {client.model_dump()}")
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
            logger.info(f"{constants.LOG_MSG_SUCCESSFULLY_CREATED_CLIENT}: {db_client.id}")
            return db_client
        except Exception as e:
            logger.error(f"{constants.LOG_MSG_ERROR_CREATING_CLIENT}: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def update_client(db: Session, client_id: int, update_data: ClientUpdate) -> Optional[Client]:
        """
        Updates an existing client.

        Args:
            db: The database session.
            client_id: The ID of the client to update.
            update_data: A ClientUpdate schema object with the fields to update.

        Returns:
            The updated Client model instance if found and updated, otherwise None.

        Raises:
            Exception: If there's an error during client update.
        """
        try:
            # Using .model_dump() as .dict() is deprecated in Pydantic v2
            logger.info(f"Updating client {client_id} with data: {update_data.model_dump(exclude_unset=True)}")
            db_client = db.query(Client).filter(Client.id == client_id).first()
            if db_client:
                update_dict = update_data.model_dump(exclude_unset=True)
                for field, value in update_dict.items():
                    if field != 'id':
                        setattr(db_client, field, value)
                db.commit()
                db.refresh(db_client)
                logger.info(f"{constants.LOG_MSG_SUCCESSFULLY_UPDATED_CLIENT} {client_id}")
                return db_client
            logger.warning(f"Client {client_id} {constants.LOG_MSG_CLIENT_NOT_FOUND_FOR_UPDATE}")
            return None
        except Exception as e:
            logger.error(f"{constants.LOG_MSG_ERROR_UPDATING_CLIENT} {client_id}: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def set_archive_status(db: Session, client_id: int, archive: bool) -> Optional[Client]:
        """
        Sets the archive status of a client.

        Args:
            db: The database session.
            client_id: The ID of the client to update.
            archive: Boolean indicating whether to archive (True) or unarchive (False).

        Returns:
            The updated Client model instance if found and updated, otherwise None.

        Raises:
            Exception: If there's an error during the status update.
        """
        try:
            logger.info(f"Setting archive status for client {client_id} to {archive}")
            db_client = db.query(Client).filter(Client.id == client_id).first()
            if db_client:
                db_client.status = ClientStatus.ARCHIVED if archive else ClientStatus.ACTIVE
                db.commit()
                db.refresh(db_client)
                logger.info(f"{constants.LOG_MSG_SUCCESSFULLY_UPDATED_ARCHIVE_STATUS} {client_id}")
                return db_client
            logger.warning(f"Client {client_id} {constants.LOG_MSG_CLIENT_NOT_FOUND_FOR_ARCHIVE}")
            return None
        except Exception as e:
            logger.error(f"{constants.LOG_MSG_ERROR_UPDATING_ARCHIVE_STATUS} {client_id}: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def delete_client(db: Session, client_id: int) -> Optional[Client]:
        """
        Deletes a client.

        Args:
            db: The database session.
            client_id: The ID of the client to delete.

        Returns:
            The Client model instance that was deleted if found, otherwise None.

        Raises:
            Exception: If there's an error during client deletion.
        """
        try:
            logger.info(f"Attempting to delete client {client_id}")
            db_client = db.query(Client).filter(Client.id == client_id).first()
            if db_client:
                logger.info(f"{constants.LOG_MSG_SUCCESSFULLY_DELETED_CLIENT} {client_id}")
                # The actual deletion and commit happen after this log,
                # but we log intent and success based on finding the client.
                # The returned db_client will be used by the API layer before it's fully invalid.
                db.delete(db_client)
                db.commit()
                return db_client
            logger.warning(f"Client {client_id} {constants.LOG_MSG_CLIENT_NOT_FOUND_FOR_DELETION}")
            return None
        except Exception as e:
            logger.error(f"{constants.LOG_MSG_ERROR_DELETING_CLIENT} {client_id}: {str(e)}")
            db.rollback()
            raise
