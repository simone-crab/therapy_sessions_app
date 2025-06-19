# API Response Messages
MSG_CLIENT_NOT_FOUND = "Client not found"
MSG_CLIENT_ARCHIVED = "Client archived"
MSG_CLIENT_UNARCHIVED = "Client unarchived"
MSG_CLIENT_DELETED = "Client deleted"

# Other generic messages (if any emerge)
MSG_ARCHIVE_STATUS_REQUIRED = "Archive status must be provided" # From previous test test_archive_client_invalid_body

# Log specific messages (can be more detailed but parts can be constant)
LOG_MSG_CLIENT_NOT_FOUND_FOR_UPDATE = "Client not found for update"
LOG_MSG_CLIENT_NOT_FOUND_FOR_ARCHIVE = "Client not found for archive status update"
LOG_MSG_CLIENT_NOT_FOUND_FOR_DELETION = "Client not found for deletion"
LOG_MSG_SUCCESSFULLY_DELETED_CLIENT = "Successfully deleted client" # {client_id} will be added dynamically
LOG_MSG_SUCCESSFULLY_UPDATED_ARCHIVE_STATUS = "Successfully updated archive status for client" # {client_id}
LOG_MSG_SUCCESSFULLY_CREATED_CLIENT = "Successfully created client with ID" # {db_client.id}
LOG_MSG_SUCCESSFULLY_UPDATED_CLIENT = "Successfully updated client" # {client_id}
LOG_MSG_ERROR_CREATING_CLIENT = "Error creating client"
LOG_MSG_ERROR_UPDATING_CLIENT = "Error updating client"
LOG_MSG_ERROR_UPDATING_ARCHIVE_STATUS = "Error updating archive status for client"
LOG_MSG_ERROR_DELETING_CLIENT = "Error deleting client"

# More specific detail messages if needed for HTTPException
DETAIL_CLIENT_NOT_FOUND = "Client not found"
DETAIL_ARCHIVE_STATUS_REQUIRED = "Archive status must be provided"
# Note: "Archive status must be provided either as a query parameter or in the request body" was the old message.
# The new API only accepts body, so "Archive status must be provided" (in body) is more accurate.
# Let's keep the one used in the current API code for the specific 400 error for now, if it's still there.
# Reviewing api/clients.py, the 400 error for archive status is gone after refactoring.
# So MSG_ARCHIVE_STATUS_REQUIRED might be for Pydantic errors now, or not used.
# For now, let's keep the constants simple and add as needed.
# The primary ones are for API responses.
MSG_ASSESSMENT_NOTE_NOT_FOUND = "Assessment note not found"
MSG_SESSION_NOTE_NOT_FOUND = "Session note not found"
MSG_SUPERVISION_NOTE_NOT_FOUND = "Supervision note not found"

MSG_REPORT_GENERATED_SUCCESS = "Report generated successfully"
MSG_NO_DATA_FOR_REPORT = "No data available for the selected client and date range."
MSG_INVALID_REPORT_TYPE = "Invalid report type requested."

# General errors
MSG_UNABLE_TO_PROCESS_REQUEST = "Unable to process request due to an internal error."
MSG_REQUEST_VALIDATION_ERROR = "Request validation failed."
MSG_AUTHENTICATION_FAILED = "Authentication failed."
MSG_PERMISSION_DENIED = "Permission denied."
MSG_RESOURCE_NOT_FOUND = "The requested resource was not found."
MSG_DUPLICATE_ENTRY = "An entry with the given details already exists."
MSG_INVALID_INPUT = "Invalid input provided."
MSG_DATABASE_ERROR = "A database error occurred."
MSG_UNKNOWN_ERROR = "An unknown error occurred."
MSG_NOT_IMPLEMENTED = "This feature is not implemented yet."
MSG_SERVICE_UNAVAILABLE = "The service is temporarily unavailable."
MSG_SUCCESS = "Operation successful."
