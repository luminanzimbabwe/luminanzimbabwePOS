"""
Database Router for Offline-First POS System
Routes operations to appropriate databases based on operation type
"""

class OfflineFirstRouter:
    """
    Router that handles:
    - Default operations to SQLite (offline-first)
    - Sync operations to Render PostgreSQL
    - Automatic database switching based on operation context
    """
    
    # Define which apps/models should use which database
    route_app_labels = {
        'core': 'default',  # Core app uses SQLite by default
    }
    
    # Models that should sync to Render database
    sync_to_render_models = [
        'core.product',
        'core.sale', 
        'core.saleitem',
        'core.stockmovement',
        'core.cashier',
        'core.shopconfiguration',
        'core.waste',
        'core.wastebatch',
        'core.stocktransfer',
        'core.cashiercount',
        'core.reconciliationsession'
    ]
    
    def db_for_read(self, model, **hints):
        """
        Route read operations to appropriate database
        """
        # Check if this is a sync operation
        if hasattr(hints.get('instance', None), '_sync_to_render'):
            return 'render'
        
        # Default to SQLite for all reads (offline-first)
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        Route write operations to appropriate database
        """
        # Check if this is a sync operation
        if hints.get('sync_to_render', False):
            return 'render'
        
        # Default to SQLite for all writes (offline-first)
        return 'default'
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations between objects in the same database
        """
        # Check if both objects are in the same database
        obj1_db = self.db_for_read(obj1.__class__, instance=obj1)
        obj2_db = self.db_for_read(obj2.__class__, instance=obj2)
        
        if obj1_db != obj2_db:
            # Allow relations only if one is SQLite (default) and other is Render
            if {obj1_db, obj2_db} == {'default', 'render'}:
                return True
            return False
        
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Control which database gets migrations
        """
        # SQLite gets all migrations (default behavior)
        if db == 'default':
            return True
        
        # Render database gets migrations for sync-enabled models
        if db == 'render':
            model_path = f"{app_label}.{model_name}"
            return model_path in self.sync_to_render_models
        
        return False
    
    def allow_sync_operation(self, operation_type, model):
        """
        Helper method to determine if operation should sync to Render
        """
        model_path = f"{model._meta.app_label}.{model._meta.model_name}"
        return model_path in self.sync_to_render_models
    
    def get_sync_status(self, model, operation='read'):
        """
        Get sync status information for a model
        """
        model_path = f"{model._meta.app_label}.{model._meta.model_name}"
        should_sync = model_path in self.sync_to_render_models
        
        return {
            'model': model_path,
            'operation': operation,
            'should_sync_to_render': should_sync,
            'primary_db': 'default',  # Always SQLite as primary
            'sync_db': 'render' if should_sync else None
        }