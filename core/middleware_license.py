"""
License Validation Middleware for LuminaN POS
Prevents unauthorized access and validates licenses on every request
"""

import json
import hashlib
import platform
import psutil
import getpass
from django.utils import timezone
from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from .models_license import License, LicenseLog


class LicenseValidationMiddleware:
    """
    Middleware to validate licenses on every request
    Prevents unauthorized access and detects tampering
    Includes performance monitoring and database health checks
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time

        # Start timing the request
        start_time = time.time()

        # Database health check - ensure connection is alive
        if not self._check_database_connection():
            return JsonResponse({
                'error': 'Database connection failed. Please try again.',
                'code': 'DB_CONNECTION_ERROR',
                'retry_after': 5
            }, status=503)

        # Skip validation for certain paths
        if self._should_skip_validation(request.path):
            response = self.get_response(request)
            # Add performance header even for skipped requests
            if hasattr(response, 'headers'):
                response_time = (time.time() - start_time) * 1000
                response.headers['X-Response-Time'] = f"{response_time:.2f}ms"
            return response

        # Get shop from request headers or session
        shop_id = self._get_shop_id(request)
        if not shop_id:
            return JsonResponse({
                'error': 'Shop identification required',
                'code': 'NO_SHOP_ID'
            }, status=401)

        # Validate license
        license_response = self._validate_license(request, shop_id)
        if license_response:
            return license_response

        # Get hardware fingerprint for this request
        fingerprint = self._generate_hardware_fingerprint(request)

        # Check if license exists and is valid
        try:
            license_obj = License.objects.get(shop_id=shop_id)
        except License.DoesNotExist:
            return JsonResponse({
                'error': 'No license found for this shop',
                'code': 'NO_LICENSE',
                'action': 'register'
            }, status=402)

        # Update validation tracking
        self._update_validation_tracking(request, license_obj, fingerprint)

        # Continue with request
        response = self.get_response(request)

        # Calculate total response time
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        # Add performance and license info to response headers
        if hasattr(response, 'headers'):
            response.headers['X-License-Status'] = license_obj.status
            response.headers['X-License-Days-Remaining'] = str(license_obj.get_days_remaining())
            response.headers['X-Response-Time'] = f"{response_time:.2f}ms"

            # Warn about slow requests (>500ms)
            if response_time > 500:
                response.headers['X-Performance-Warning'] = f"Slow request: {response_time:.2f}ms"

        return response
    
    def _should_skip_validation(self, path):
        """Skip validation for certain paths"""
        skip_paths = [
            '/api/v1/shop/register/',
            '/api/v1/license/activate/',
            '/api/v1/license/status/',
            '/api/v1/license/renew/',
            '/api/v1/shop/delete-today-sales/',  # No auth required - owner-only endpoint
            '/static/',
            '/media/',
            '/admin/',
            '/favicon.ico'
        ]
        
        # Skip for OPTIONS requests (CORS preflight)
        if path in ['/api/v1/shop/status/', '/api/v1/shop/register/']:
            return True
        
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    def _get_shop_id(self, request):
        """Extract shop ID from request"""
        # Try header first
        shop_id = request.META.get('HTTP_X_SHOP_ID')
        if shop_id:
            return shop_id
        
        # Try session
        if hasattr(request, 'session'):
            shop_id = request.session.get('shop_id')
            if shop_id:
                return shop_id
        
        # Try query parameter
        shop_id = request.GET.get('shop_id') or request.POST.get('shop_id')
        if shop_id:
            return shop_id
        
        return None
    
    def _validate_license(self, request, shop_id):
        """Validate license and return error response if invalid"""
        try:
            license_obj = License.objects.get(shop_id=shop_id)
        except License.DoesNotExist:
            return JsonResponse({
                'error': 'No license found for this shop',
                'code': 'NO_LICENSE',
                'action': 'register'
            }, status=402)
        
        # Check if license is valid
        if not license_obj.is_valid():
            if license_obj.tampering_detected:
                return JsonResponse({
                    'error': 'License tampering detected. Contact support.',
                    'code': 'TAMPERING_DETECTED',
                    'status': 'revoked'
                }, status=403)
            
            if license_obj.status == 'SUSPENDED':
                return JsonResponse({
                    'error': 'License has been suspended',
                    'code': 'LICENSE_SUSPENDED',
                    'status': 'suspended'
                }, status=403)
            
            if license_obj.status == 'REVOKED':
                return JsonResponse({
                    'error': 'License has been revoked',
                    'code': 'LICENSE_REVOKED',
                    'status': 'revoked'
                }, status=403)
            
            # License expired
            return JsonResponse({
                'error': 'License has expired',
                'code': 'LICENSE_EXPIRED',
                'status': 'expired',
                'days_remaining': license_obj.get_days_remaining()
            }, status=402)
        
        # Check if license integrity has been compromised
        if not license_obj.validate_integrity():
            license_obj.tampering_detected = True
            license_obj.save(update_fields=['tampering_detected'])
            
            # Log the tampering attempt
            LicenseLog.objects.create(
                license=license_obj,
                action='TAMPERING_DETECTED',
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'path': request.path, 'method': request.method}
            )
            
            return JsonResponse({
                'error': 'License integrity check failed',
                'code': 'INTEGRITY_CHECK_FAILED',
                'status': 'revoked'
            }, status=403)
        
        return None  # License is valid
    
    def _generate_hardware_fingerprint(self, request):
        """Generate a unique hardware fingerprint for the current system"""
        try:
            # Get system information
            fingerprint_data = {
                'platform': platform.platform(),
                'system': platform.system(),
                'processor': platform.processor(),
                'machine': platform.machine(),
                'architecture': platform.architecture()[0],
                'hostname': platform.node(),
                'username': getpass.getuser(),
                'cpu_count': psutil.cpu_count(),
                'memory_total': psutil.virtual_memory().total,
                'disk_total': psutil.disk_usage('/').total if platform.system() != 'Windows' else psutil.disk_usage('C:\\').total,
            }
            
            # Convert to string and hash
            fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
            fingerprint_hash = hashlib.sha256(fingerprint_string.encode()).hexdigest()
            
            return fingerprint_hash
        except Exception:
            # Fallback to simple fingerprint if hardware info fails
            return hashlib.sha256(f"{request.META.get('REMOTE_ADDR', 'unknown')}{platform.node()}".encode()).hexdigest()
    
    def _update_validation_tracking(self, request, license_obj, fingerprint):
        """Update license validation tracking"""
        try:
            # Check if this is a new hardware fingerprint
            if license_obj.activation_fingerprint and license_obj.activation_fingerprint != fingerprint:
                # Different hardware detected
                LicenseLog.objects.create(
                    license=license_obj,
                    action='TAMPERING_DETECTED',
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    details={
                        'path': request.path,
                        'method': request.method,
                        'reason': 'hardware_mismatch',
                        'original_fingerprint': license_obj.activation_fingerprint,
                        'current_fingerprint': fingerprint
                    }
                )
                
                # Mark as potential tampering
                license_obj.tampering_detected = True
                license_obj.save(update_fields=['tampering_detected'])
            
            # Update validation tracking
            license_obj.update_validation({
                'path': request.path,
                'method': request.method,
                'ip': self._get_client_ip(request)
            })
            
            # Log the validation
            LicenseLog.objects.create(
                license=license_obj,
                action='VALIDATED',
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'path': request.path,
                    'method': request.method,
                    'fingerprint': fingerprint[:16] + '...'  # Truncate for security
                }
            )
            
        except Exception as e:
            # Log error but don't block the request
            print(f"License tracking error: {e}")
    
    def _check_database_connection(self):
        """Check if database connection is healthy"""
        try:
            # Use cached result to avoid checking on every request
            cache_key = 'db_connection_health'
            cached_result = cache.get(cache_key)

            if cached_result is not None:
                return cached_result

            # Perform actual database check
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()

            # Cache successful result for 30 seconds
            cache.set(cache_key, True, 30)
            return True

        except Exception as e:
            # Cache failure result for 10 seconds to avoid overwhelming the database
            cache.set(cache_key, False, 10)
            print(f"Database connection check failed: {e}")
            return False

    def _get_client_ip(self, request):
        """Get the real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LicenseEnforcementMiddleware:
    """
    Additional middleware to enforce license restrictions
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get shop ID
        shop_id = self._get_shop_id(request)
        if not shop_id:
            return self.get_response(request)
        
        # Check if this is a critical operation that needs license check
        if self._is_critical_operation(request.path):
            try:
                license_obj = License.objects.get(shop_id=shop_id)
                
                # Check if license is about to expire
                days_remaining = license_obj.get_days_remaining()
                if days_remaining <= 7 and days_remaining > 0:
                    # Add warning header
                    response = self.get_response(request)
                    response.headers['X-License-Warning'] = f'License expires in {days_remaining} days'
                    return response
                
            except License.DoesNotExist:
                pass
        
        return self.get_response(request)
    
    def _get_shop_id(self, request):
        """Extract shop ID from request"""
        return request.META.get('HTTP_X_SHOP_ID') or request.session.get('shop_id')
    
    def _is_critical_operation(self, path):
        """Check if this is a critical operation"""
        critical_operations = [
            '/api/v1/sales/',
            '/api/v1/products/',
            '/api/v1/inventory/',
            '/api/v1/cash-float/',
            '/api/v1/reconciliation/',
        ]
        
        return any(path.startswith(op) for op in critical_operations)


def license_required(view_func):
    """
    Decorator to require valid license for specific views
    """
    def wrapper(request, *args, **kwargs):
        shop_id = request.META.get('HTTP_X_SHOP_ID') or request.session.get('shop_id')
        if not shop_id:
            return JsonResponse({
                'error': 'Shop identification required',
                'code': 'NO_SHOP_ID'
            }, status=401)
        
        try:
            license_obj = License.objects.get(shop_id=shop_id)
            if not license_obj.is_valid():
                return JsonResponse({
                    'error': 'Valid license required',
                    'code': 'INVALID_LICENSE',
                    'status': license_obj.status
                }, status=402)
        except License.DoesNotExist:
            return JsonResponse({
                'error': 'No license found',
                'code': 'NO_LICENSE'
            }, status=402)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper