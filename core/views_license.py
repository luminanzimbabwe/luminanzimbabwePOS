"""
License Management API Views for LuminaN POS
Handles license activation, renewal, validation, and management
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
import json
import hashlib
import platform
import psutil
import getpass

from .models_license import License, LicenseLog
from .models import Shop
from .serializers import ShopSerializer


@csrf_exempt
@require_http_methods(["GET", "POST"])
def license_status(request):
    """
    Get license status for a shop
    POST: Activate a new license
    GET: Check current license status
    """
    if request.method == 'GET':
        return get_license_status(request)
    elif request.method == 'POST':
        return activate_license(request)


def get_license_status(request):
    """Get current license status"""
    shop_id = request.GET.get('shop_id') or request.META.get('HTTP_X_SHOP_ID')
    
    if not shop_id:
        return JsonResponse({
            'error': 'Shop ID required',
            'code': 'NO_SHOP_ID'
        }, status=400)
    
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return JsonResponse({
            'error': 'Shop not found',
            'code': 'SHOP_NOT_FOUND'
        }, status=404)
    
    try:
        license_obj = License.objects.get(shop=shop)
        
        # Get hardware fingerprint
        current_fingerprint = generate_hardware_fingerprint(request)
        
        response_data = {
            'shop': {
                'id': shop.id,
                'name': shop.name,
                'email': shop.email,
            },
            'license': {
                'id': str(license_obj.id),
                'type': license_obj.license_type,
                'status': license_obj.status,
                'issued_date': license_obj.issued_date.isoformat() if license_obj.issued_date else None,
                'activation_date': license_obj.activation_date.isoformat() if license_obj.activation_date else None,
                'expiry_date': license_obj.expiry_date.isoformat() if license_obj.expiry_date else None,
                'days_remaining': license_obj.get_days_remaining(),
                'is_valid': license_obj.is_valid(),
                'tampering_detected': license_obj.tampering_detected,
                'validation_count': license_obj.validation_count,
            },
            'hardware': {
                'current_fingerprint': current_fingerprint[:16] + '...',
                'original_fingerprint': license_obj.activation_fingerprint[:16] + '...' if license_obj.activation_fingerprint else None,
                'hardware_match': license_obj.activation_fingerprint == current_fingerprint if license_obj.activation_fingerprint else True,
            },
            'usage': {
                'last_validation': license_obj.last_validation.isoformat() if license_obj.last_validation else None,
                'total_validations': license_obj.validation_count,
            }
        }
        
        # Add warnings for expired or expiring licenses
        warnings = []
        if not license_obj.is_valid():
            if license_obj.status == 'EXPIRED':
                warnings.append('License has expired')
            elif license_obj.status == 'SUSPENDED':
                warnings.append('License has been suspended')
            elif license_obj.status == 'REVOKED':
                warnings.append('License has been revoked')
            elif license_obj.tampering_detected:
                warnings.append('License tampering detected')
        
        days_remaining = license_obj.get_days_remaining()
        if days_remaining <= 7 and days_remaining > 0:
            warnings.append(f'License expires in {days_remaining} days')
        
        if warnings:
            response_data['warnings'] = warnings
        
        return JsonResponse(response_data)
        
    except License.DoesNotExist:
        return JsonResponse({
            'error': 'No license found for this shop',
            'code': 'NO_LICENSE',
            'action': 'register',
            'shop': ShopSerializer(shop).data
        }, status=404)


def activate_license(request):
    """Activate a new license for a shop"""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data',
            'code': 'INVALID_JSON'
        }, status=400)
    
    shop_id = data.get('shop_id')
    license_type = data.get('license_type', 'TRIAL')
    max_trial_days = data.get('max_trial_days', 30)
    
    if not shop_id:
        return JsonResponse({
            'error': 'Shop ID required',
            'code': 'NO_SHOP_ID'
        }, status=400)
    
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return JsonResponse({
            'error': 'Shop not found',
            'code': 'SHOP_NOT_FOUND'
        }, status=404)
    
    # Check if license already exists
    existing_license = License.objects.filter(shop=shop).first()
    if existing_license and existing_license.status != 'TRIAL':
        return JsonResponse({
            'error': 'License already exists for this shop',
            'code': 'LICENSE_EXISTS',
            'license': {
                'id': str(existing_license.id),
                'status': existing_license.status,
                'type': existing_license.license_type
            }
        }, status=400)
    
    # Generate hardware fingerprint
    fingerprint = generate_hardware_fingerprint(request)
    
    # Create or update license
    if existing_license:
        license_obj = existing_license
    else:
        license_obj = License(shop=shop)
    
    license_obj.license_type = license_type
    license_obj.max_trial_days = max_trial_days
    
    # Activate the license
    success = license_obj.activate_license(fingerprint)
    
    if success:
        # Log the activation
        LicenseLog.objects.create(
            license=license_obj,
            action='ACTIVATED',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={
                'license_type': license_type,
                'max_trial_days': max_trial_days,
                'fingerprint': fingerprint[:16] + '...'
            }
        )
        
        return JsonResponse({
            'success': True,
            'message': 'License activated successfully',
            'license': {
                'id': str(license_obj.id),
                'type': license_obj.license_type,
                'status': license_obj.status,
                'license_key': license_obj.license_key,
                'activation_date': license_obj.activation_date.isoformat() if license_obj.activation_date else None,
                'expiry_date': license_obj.expiry_date.isoformat() if license_obj.expiry_date else None,
                'days_remaining': license_obj.get_days_remaining(),
                'is_valid': license_obj.is_valid(),
            },
            'shop': {
                'id': shop.id,
                'name': shop.name,
                'email': shop.email,
            }
        })
    else:
        return JsonResponse({
            'error': 'Failed to activate license',
            'code': 'ACTIVATION_FAILED'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def renew_license(request):
    """
    Renew an existing license
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data',
            'code': 'INVALID_JSON'
        }, status=400)
    
    shop_id = data.get('shop_id')
    months = data.get('months', 1)
    license_key = data.get('license_key')
    
    if not shop_id:
        return JsonResponse({
            'error': 'Shop ID required',
            'code': 'NO_SHOP_ID'
        }, status=400)
    
    try:
        shop = Shop.objects.get(id=shop_id)
        license_obj = License.objects.get(shop=shop)
        
        # Verify license key if provided
        if license_key and license_obj.license_key != license_key:
            return JsonResponse({
                'error': 'Invalid license key',
                'code': 'INVALID_LICENSE_KEY'
            }, status=400)
        
        # Check if license can be renewed
        if license_obj.status in ['REVOKED']:
            return JsonResponse({
                'error': 'License cannot be renewed',
                'code': 'LICENSE_CANNOT_BE_RENEWED'
            }, status=400)
        
        # Renew the license
        license_obj.renew_license(months)
        
        # Log the renewal
        LicenseLog.objects.create(
            license=license_obj,
            action='RENEWED',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={
                'months': months,
                'previous_expiry': license_obj.expiry_date.isoformat()
            }
        )
        
        return JsonResponse({
            'success': True,
            'message': f'License renewed for {months} month(s)',
            'license': {
                'id': str(license_obj.id),
                'type': license_obj.license_type,
                'status': license_obj.status,
                'expiry_date': license_obj.expiry_date.isoformat(),
                'days_remaining': license_obj.get_days_remaining(),
                'is_valid': license_obj.is_valid(),
            }
        })
        
    except Shop.DoesNotExist:
        return JsonResponse({
            'error': 'Shop not found',
            'code': 'SHOP_NOT_FOUND'
        }, status=404)
    except License.DoesNotExist:
        return JsonResponse({
            'error': 'No license found for this shop',
            'code': 'NO_LICENSE'
        }, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def suspend_license(request):
    """
    Suspend a license (admin function)
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data',
            'code': 'INVALID_JSON'
        }, status=400)
    
    shop_id = data.get('shop_id')
    reason = data.get('reason', 'Manual suspension')
    admin_key = data.get('admin_key')  # Add admin authentication
    
    # TODO: Implement proper admin authentication
    if not admin_key or admin_key != settings.ADMIN_LICENSE_KEY:
        return JsonResponse({
            'error': 'Invalid admin key',
            'code': 'INVALID_ADMIN_KEY'
        }, status=403)
    
    try:
        license_obj = License.objects.get(shop_id=shop_id)
        license_obj.suspend_license(reason)
        
        # Log the suspension
        LicenseLog.objects.create(
            license=license_obj,
            action='SUSPENDED',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'reason': reason}
        )
        
        return JsonResponse({
            'success': True,
            'message': 'License suspended successfully'
        })
        
    except License.DoesNotExist:
        return JsonResponse({
            'error': 'License not found',
            'code': 'LICENSE_NOT_FOUND'
        }, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def revoke_license(request):
    """
    Revoke a license permanently (admin function)
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data',
            'code': 'INVALID_JSON'
        }, status=400)
    
    shop_id = data.get('shop_id')
    reason = data.get('reason', 'Manual revocation')
    admin_key = data.get('admin_key')
    
    # TODO: Implement proper admin authentication
    if not admin_key or admin_key != settings.ADMIN_LICENSE_KEY:
        return JsonResponse({
            'error': 'Invalid admin key',
            'code': 'INVALID_ADMIN_KEY'
        }, status=403)
    
    try:
        license_obj = License.objects.get(shop_id=shop_id)
        license_obj.revoke_license(reason)
        
        # Log the revocation
        LicenseLog.objects.create(
            license=license_obj,
            action='REVOKED',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'reason': reason}
        )
        
        return JsonResponse({
            'success': True,
            'message': 'License revoked successfully'
        })
        
    except License.DoesNotExist:
        return JsonResponse({
            'error': 'License not found',
            'code': 'LICENSE_NOT_FOUND'
        }, status=404)


@csrf_exempt
@require_http_methods(["GET"])
def license_logs(request):
    """
    Get license activity logs for a shop
    """
    shop_id = request.GET.get('shop_id')
    limit = int(request.GET.get('limit', 50))
    
    if not shop_id:
        return JsonResponse({
            'error': 'Shop ID required',
            'code': 'NO_SHOP_ID'
        }, status=400)
    
    try:
        license_obj = License.objects.get(shop_id=shop_id)
        logs = LicenseLog.objects.filter(license=license_obj)[:limit]
        
        log_data = []
        for log in logs:
            log_data.append({
                'id': log.id,
                'action': log.action,
                'timestamp': log.timestamp.isoformat(),
                'ip_address': log.ip_address,
                'details': log.details
            })
        
        return JsonResponse({
            'logs': log_data,
            'total': logs.count()
        })
        
    except License.DoesNotExist:
        return JsonResponse({
            'error': 'License not found',
            'code': 'LICENSE_NOT_FOUND'
        }, status=404)


def generate_hardware_fingerprint(request):
    """Generate hardware fingerprint for the current system"""
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
        }
        
        # Convert to string and hash
        import json
        fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
        fingerprint_hash = hashlib.sha256(fingerprint_string.encode()).hexdigest()
        
        return fingerprint_hash
    except Exception:
        # Fallback
        import socket
        return hashlib.sha256(f"{socket.gethostname()}{platform.node()}".encode()).hexdigest()


def get_client_ip(request):
    """Get the real client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@csrf_exempt
@require_http_methods(["POST"])
def validate_license_advanced(request):
    """
    Advanced license validation with detailed checks
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data',
            'code': 'INVALID_JSON'
        }, status=400)
    
    shop_id = data.get('shop_id')
    current_fingerprint = data.get('fingerprint')
    
    if not shop_id:
        return JsonResponse({
            'error': 'Shop ID required',
            'code': 'NO_SHOP_ID'
        }, status=400)
    
    try:
        license_obj = License.objects.get(shop_id=shop_id)
        
        # Detailed validation checks
        validation_results = {
            'basic_validation': license_obj.is_valid(),
            'integrity_check': license_obj.validate_integrity(),
            'tampering_detected': license_obj.tampering_detected,
            'status': license_obj.status,
            'days_remaining': license_obj.get_days_remaining(),
        }
        
        # Hardware validation
        if current_fingerprint:
            hardware_match = license_obj.activation_fingerprint == current_fingerprint if license_obj.activation_fingerprint else True
            validation_results['hardware_validation'] = {
                'match': hardware_match,
                'original_fingerprint': license_obj.activation_fingerprint[:16] + '...' if license_obj.activation_fingerprint else None,
                'current_fingerprint': current_fingerprint[:16] + '...' if current_fingerprint else None,
            }
        
        # Time validation
        current_time = timezone.now()
        validation_results['time_validation'] = {
            'current_time': current_time.isoformat(),
            'issued_date': license_obj.issued_date.isoformat() if license_obj.issued_date else None,
            'expiry_date': license_obj.expiry_date.isoformat() if license_obj.expiry_date else None,
            'time_manipulation_detected': current_time < license_obj.issued_date if license_obj.issued_date else False,
        }
        
        # Usage validation
        validation_results['usage_validation'] = {
            'validation_count': license_obj.validation_count,
            'last_validation': license_obj.last_validation.isoformat() if license_obj.last_validation else None,
            'daily_usage': license_obj.usage_tracking.get('daily_usage', {}),
        }
        
        # Overall status
        is_valid = (validation_results['basic_validation'] and 
                   validation_results['integrity_check'] and 
                   not validation_results['tampering_detected'])
        
        validation_results['overall_valid'] = is_valid
        
        return JsonResponse(validation_results)
        
    except License.DoesNotExist:
        return JsonResponse({
            'error': 'License not found',
            'code': 'LICENSE_NOT_FOUND'
        }, status=404)