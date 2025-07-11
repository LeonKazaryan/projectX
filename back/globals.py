# Global instances for the application
telegram_manager = None

# Session ID to User ID mapping (in-memory for performance)
session_user_mapping = {}

def get_telegram_manager():
    """Get the global telegram manager instance"""
    if telegram_manager is None:
        raise Exception("Telegram manager not initialized")
    return telegram_manager

def set_telegram_manager(manager):
    """Set the global telegram manager instance"""
    global telegram_manager
    telegram_manager = manager

def set_session_user_mapping(session_id: str, user_id: int):
    """Map session_id to user_id for Telegram client lookup"""
    global session_user_mapping
    session_user_mapping[session_id] = user_id

def get_user_id_from_session(session_id: str) -> int | None:
    """Get user_id from session_id"""
    return session_user_mapping.get(session_id)

def clear_session_mapping(session_id: str):
    """Clear session mapping when user logs out"""
    global session_user_mapping
    session_user_mapping.pop(session_id, None) 