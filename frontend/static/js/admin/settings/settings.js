// Settings Management JavaScript - Kenya/M-Pesa Focus
let currentTab = 'general';

document.addEventListener('DOMContentLoaded', function() {
    loadGeneralSettings();
    loadPaymentSettings();
    loadSecuritySettings();
    loadApiKey();
});

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide tab content
    document.getElementById('generalTab').classList.remove('active');
    document.getElementById('paymentTab').classList.remove('active');
    document.getElementById('securityTab').classList.remove('active');
    
    if (tab === 'general') {
        document.getElementById('generalTab').classList.add('active');
    } else if (tab === 'payment') {
        document.getElementById('paymentTab').classList.add('active');
    } else if (tab === 'security') {
        document.getElementById('securityTab').classList.add('active');
    }
}

// ============================================
// GENERAL SETTINGS
// ============================================

async function loadGeneralSettings() {
    try {
        const data = await apiRequest('/api/admin/settings/general/');
        if (data.settings) {
            document.getElementById('siteName').value = data.settings.site_name || 'EventHub';
            document.getElementById('siteTagline').value = data.settings.site_tagline || 'Discover Amazing Events in Kenya';
            document.getElementById('logoUrl').value = data.settings.logo_url || '';
            document.getElementById('supportEmail').value = data.settings.support_email || 'support@eventhub.co.ke';
            document.getElementById('supportPhone').value = data.settings.support_phone || '+254 700 000000';
            document.getElementById('companyAddress').value = data.settings.company_address || 'Nairobi, Kenya';
            document.getElementById('timezone').value = data.settings.timezone || 'Africa/Nairobi';
            document.getElementById('dateFormat').value = data.settings.date_format || 'DD/MM/YYYY';
            document.getElementById('facebookUrl').value = data.settings.facebook_url || '';
            document.getElementById('twitterUrl').value = data.settings.twitter_url || '';
            document.getElementById('instagramUrl').value = data.settings.instagram_url || '';
            document.getElementById('linkedinUrl').value = data.settings.linkedin_url || '';
        }
    } catch (error) {
        console.error('Error loading general settings:', error);
    }
}

async function saveGeneralSettings() {
    const formData = {
        site_name: document.getElementById('siteName').value,
        site_tagline: document.getElementById('siteTagline').value,
        logo_url: document.getElementById('logoUrl').value,
        support_email: document.getElementById('supportEmail').value,
        support_phone: document.getElementById('supportPhone').value,
        company_address: document.getElementById('companyAddress').value,
        timezone: document.getElementById('timezone').value,
        date_format: document.getElementById('dateFormat').value,
        facebook_url: document.getElementById('facebookUrl').value,
        twitter_url: document.getElementById('twitterUrl').value,
        instagram_url: document.getElementById('instagramUrl').value,
        linkedin_url: document.getElementById('linkedinUrl').value
    };
    
    Loader.show('Saving general settings...');
    
    try {
        await apiRequest('/api/admin/settings/general/', 'POST', formData);
        showSuccessMessage('General settings saved successfully');
    } catch (error) {
        console.error('Error saving general settings:', error);
        showErrorMessage('Failed to save general settings');
    } finally {
        Loader.hide();
    }
}

// ============================================
// PAYMENT SETTINGS (M-Pesa Only)
// ============================================

async function loadPaymentSettings() {
    try {
        const data = await apiRequest('/api/admin/settings/payment/');
        if (data.settings) {
            document.getElementById('platformFee').value = data.settings.platform_fee || '5';
            document.getElementById('processingFee').value = data.settings.processing_fee || '0';
            document.getElementById('minPayout').value = data.settings.min_payout || '500';
            
            document.getElementById('mpesaEnv').value = data.settings.mpesa_env || 'sandbox';
            document.getElementById('mpesaShortcode').value = data.settings.mpesa_shortcode || '174379';
            document.getElementById('mpesaPasskey').value = data.settings.mpesa_passkey || '';
            document.getElementById('mpesaConsumerKey').value = data.settings.mpesa_consumer_key || '';
            document.getElementById('mpesaConsumerSecret').value = data.settings.mpesa_consumer_secret || '';
            document.getElementById('mpesaCallbackUrl').value = data.settings.mpesa_callback_url || 'https://eventhub.co.ke/api/mpesa/callback/';
        }
    } catch (error) {
        console.error('Error loading payment settings:', error);
    }
}

async function savePaymentSettings() {
    const formData = {
        platform_fee: parseFloat(document.getElementById('platformFee').value),
        processing_fee: parseFloat(document.getElementById('processingFee').value),
        min_payout: parseFloat(document.getElementById('minPayout').value),
        mpesa_env: document.getElementById('mpesaEnv').value,
        mpesa_shortcode: document.getElementById('mpesaShortcode').value,
        mpesa_passkey: document.getElementById('mpesaPasskey').value,
        mpesa_consumer_key: document.getElementById('mpesaConsumerKey').value,
        mpesa_consumer_secret: document.getElementById('mpesaConsumerSecret').value,
        mpesa_callback_url: document.getElementById('mpesaCallbackUrl').value
    };
    
    Loader.show('Saving payment settings...');
    
    try {
        await apiRequest('/api/admin/settings/payment/', 'POST', formData);
        showSuccessMessage('Payment settings saved successfully');
    } catch (error) {
        console.error('Error saving payment settings:', error);
        showErrorMessage('Failed to save payment settings');
    } finally {
        Loader.hide();
    }
}

async function testMpesaConnection() {
    Loader.show('Testing M-Pesa connection...');
    
    try {
        const data = await apiRequest('/api/admin/settings/test-mpesa/');
        if (data.success) {
            showSuccessMessage('M-Pesa connection successful!');
        } else {
            showErrorMessage('M-Pesa connection failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error testing M-Pesa:', error);
        showErrorMessage('Failed to test M-Pesa connection');
    } finally {
        Loader.hide();
    }
}

// ============================================
// SECURITY SETTINGS
// ============================================

async function loadSecuritySettings() {
    try {
        const data = await apiRequest('/api/admin/settings/security/');
        if (data.settings) {
            document.getElementById('requireEmailVerification').checked = data.settings.require_email_verification || false;
            document.getElementById('adminTwoFactor').checked = data.settings.admin_two_factor || false;
            document.getElementById('maxLoginAttempts').value = data.settings.max_login_attempts || '5';
            document.getElementById('lockoutDuration').value = data.settings.lockout_duration || '15';
            document.getElementById('sessionTimeout').value = data.settings.session_timeout || '30';
            document.getElementById('minPasswordLength').value = data.settings.min_password_length || '8';
            document.getElementById('requireUppercase').checked = data.settings.require_uppercase || false;
            document.getElementById('requireLowercase').checked = data.settings.require_lowercase || false;
            document.getElementById('requireNumbers').checked = data.settings.require_numbers || false;
            document.getElementById('requireSpecialChar').checked = data.settings.require_special_char || false;
            document.getElementById('passwordExpiry').value = data.settings.password_expiry || '90';
            document.getElementById('enableAuditLog').checked = data.settings.enable_audit_log || false;
        }
    } catch (error) {
        console.error('Error loading security settings:', error);
    }
}

async function saveSecuritySettings() {
    const formData = {
        require_email_verification: document.getElementById('requireEmailVerification').checked,
        admin_two_factor: document.getElementById('adminTwoFactor').checked,
        max_login_attempts: parseInt(document.getElementById('maxLoginAttempts').value),
        lockout_duration: parseInt(document.getElementById('lockoutDuration').value),
        session_timeout: parseInt(document.getElementById('sessionTimeout').value),
        min_password_length: parseInt(document.getElementById('minPasswordLength').value),
        require_uppercase: document.getElementById('requireUppercase').checked,
        require_lowercase: document.getElementById('requireLowercase').checked,
        require_numbers: document.getElementById('requireNumbers').checked,
        require_special_char: document.getElementById('requireSpecialChar').checked,
        password_expiry: parseInt(document.getElementById('passwordExpiry').value),
        enable_audit_log: document.getElementById('enableAuditLog').checked
    };
    
    Loader.show('Saving security settings...');
    
    try {
        await apiRequest('/api/admin/settings/security/', 'POST', formData);
        showSuccessMessage('Security settings saved successfully');
    } catch (error) {
        console.error('Error saving security settings:', error);
        showErrorMessage('Failed to save security settings');
    } finally {
        Loader.hide();
    }
}

// ============================================
// API KEY MANAGEMENT
// ============================================

async function loadApiKey() {
    try {
        const data = await apiRequest('/api/admin/settings/api-key/');
        if (data.api_key) {
            document.getElementById('apiKey').value = data.api_key;
        }
    } catch (error) {
        console.error('Error loading API key:', error);
    }
}

async function regenerateApiKey() {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will be invalidated immediately.')) {
        return;
    }
    
    Loader.show('Regenerating API key...');
    
    try {
        const data = await apiRequest('/api/admin/settings/regenerate-api-key/', 'POST');
        if (data.api_key) {
            document.getElementById('apiKey').value = data.api_key;
            showSuccessMessage('API key regenerated successfully');
        }
    } catch (error) {
        console.error('Error regenerating API key:', error);
        showErrorMessage('Failed to regenerate API key');
    } finally {
        Loader.hide();
    }
}

function downloadAuditLog() {
    window.open('/api/admin/settings/audit-log/download/', '_blank');
    showSuccessMessage('Audit log download started');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.style.borderLeftColor = '#ef4444';
    toast.innerHTML = `<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions global
window.switchTab = switchTab;
window.saveGeneralSettings = saveGeneralSettings;
window.savePaymentSettings = savePaymentSettings;
window.saveSecuritySettings = saveSecuritySettings;
window.testMpesaConnection = testMpesaConnection;
window.regenerateApiKey = regenerateApiKey;
window.downloadAuditLog = downloadAuditLog;