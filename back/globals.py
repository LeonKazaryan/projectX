# Global instances for the application
telegram_manager = None

def get_telegram_manager():
    """Get the global telegram manager instance"""
    if telegram_manager is None:
        raise Exception("Telegram manager not initialized")
    return telegram_manager

def set_telegram_manager(manager):
    """Set the global telegram manager instance"""
    global telegram_manager
    telegram_manager = manager 