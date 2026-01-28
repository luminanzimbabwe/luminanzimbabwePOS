from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    
    def ready(self):
        # Import signals to ensure they are registered
        import core.signals
        
        # Log successful initialization
        logger.info("Core app initialized - EOD reconciliation system ready")