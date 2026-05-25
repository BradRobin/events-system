// Settings Management JavaScript
// Handles general settings, payment settings, email settings, and security settings

document.addEventListener('DOMContentLoaded', function() {
    loadAllSettings();
    attachEventListeners();
});

function attachEventListeners() {
    // General Settings Form
    const generalForm = document.getElementById('generalSettingsForm');
    if (generalForm) {
        generalForm.addEventListener('submit', saveGeneralSettings);
    }
    
    // Payment Settings Form
    const paymentForm = document.getElementById('paymentSettingsForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', savePaymentSettings);
    }
    
    // Email Settings Form
    const emailForm = document.getElementById('emailSettingsForm');
    if (emailForm) {
        emailForm.addEventListener('submit', saveEmailSettings);
    }
    
    // Security Settings Form
    const securityForm = document.getElementById('securitySettingsForm');
    if (securityForm) {
        securityForm.addEventListener('submit', saveSecuritySettings);
    }
    
    // Individual payment form (for payment-settings.html)
    const individualPaymentForm = document.getElementById('paymentForm');
    if (individualPaymentForm) {
        individualPaymentForm.addEventListener('submit', saveIndividualPaymentSettings);
    }
    
    // Individual security form (for security-settings.html)
    const individualSecurityForm = document.getElementById('securityForm');
    if (individualSecurityForm) {
        individualSecurityForm.addEventListener('submit', saveIndividualSecuritySettings);
    }
}

async function loadAllSettings() {
    Loader.show('Loading settings...');
    
    try {
        await Promise.all([
            loadGeneralSettings(),
            loadPaymentSettings(),
            loadEmailSettings(),
            loadSecuritySettings()
        ]);
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Failed to load settings', 'error');
    } finally {
        Loader.hide();
    }
}

// ============================================
// GENERAL SETTINGS
// ============================================

async function loadGeneralSettings() {
    try {
        const data = await apiRequest('/api/admin/settings/general/');
        
        if (data.settings) {
            const siteName = document.getElementById('siteName');
            const siteDescription = document.getElementById('siteDescription');
            const contactEmail = document.getElementById('contactEmail');
            const timezone = document.getElementById('timezone');
            
            if (siteName) siteName.value = data.settings.site_name || 'EventHub';
            if (siteDescription) siteDescription.value = data.settings.site_description || '';
            if (contactEmail) contactEmail.value = data.settings.contact_email || 'info@eventhub.com';
            if (timezone) timezone.value = data.settings.timezone || 'Africa/Nairobi';
        }
    } catch (error) {
        console.error('Error loading general settings:', error);
    }
}

async function saveGeneralSettings(event) {
    event.preventDefault();
    
    const formData = {
        site_name: document.getElementById('siteName')?.value || '',
        site_description: document.getElementById('siteDescription')?.value || '',
        contact_email: document.getElementById('contactEmail')?.value || '',
        timezone: document.getElementById('timezone')?.value || 'Africa/Nairobi'
    };
    
    Loader.show('Saving general settings...');
    
    try {
        await apiRequest('/api/admin/settings/general/', 'POST', formData);
        showToast('General settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving general settings:', error);
        showToast('Failed to save general settings', 'error');
    } finally {
        Loader.hide();
    }
}

// ============================================
// PAYMENT SETTINGS
// ============================================

async function loadPaymentSettings() {
    try {
        const data = await apiRequest('/api/admin/settings/payment/');
        
        if (data.settings) {
            const currency = document.getElementById('currency');
            const platformFee = document.getElementById('platformFee');
            const mpesaApiKey = document.getElementById('mpesaApiKey');
            const mpesaShortcode = document.getElementById('mpesaShortcode');
            const mpesaKey = document.getElementById('mpesaKey');
            const mpesaSecret = document.getElementById('mpesaSecret');
            const mpesaEnv = document.getElementById('mpesaEnv');
            
            if (currency) currency.value = data.settings.currency || 'KES';
            if (platformFee) platformFee.value = data.settings.platform_fee || '5';
            if (mpesaApiKey) mpesaApiKey.value = data.settings.mpesa_api_key || '';
            if (mpesaShortcode) mpesaShortcode.value = data.settings.mpesa_shortcode || '';
            if (mpesaKey) mpesaKey.value = data.settings.mpesa_key || '';
            if (mpesaSecret) mpesaSecret.value = data.settings.mpesa_secret || '';
            if (mpesaEnv) mpesaEnv.value = data.settings.mpesa_env || 'sandbox';
        }
    } catch (error) {
        console.error('Error loading payment settings:', error);
    }
}

async function savePaymentSettings(event) {
    event.preventDefault();
    
    const formData = {
        currency: document.getElementById('currency')?.value || 'KES',
        platform_fee: parseFloat(document.getElementById('platformFee')?.value) || 5,
        mpesa_api_key: document.getElementById('mpesaApiKey')?.value || ''
    };
    
    Loader.show('Saving payment settings...');
    
    try {
        await apiRequest('/api/admin/settings/payment/', 'POST', formData);
        showToast('Payment settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving payment settings:', error);
        showToast('Failed to save payment settings', 'error');
    } finally {
        Loader.hide();
    }
}

async function saveIndividualPaymentSettings(event) {
    event.preventDefault();
    
    const formData = {
        platform_fee: parseFloat(document.getElementById('platformFee')?.value) || 5,
        mpesa_shortcode: document.getElementById('mpesaShortcode')?.value || '',
        mpesa_key: document.getElementById('mpesaKey')?.value || '',
        mpesa_secret: document.getElementById('mpesaSecret')?.value || '',
        mpesa_env: document.getElementById('mpesaEnv')?.value || 'sandbox'
    };
    
    Loader.show('Saving payment settings...');
    
    try {
        await apiRequest('/api/admin/settings/payment/', 'POST', formData);
        showToast('Payment settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving payment settings:', error);
        showToast('Failed to save payment settings', 'error');
    } finally {
        Loader.hide();
    }
}

// ============================================
// EMAIL SETTINGS
// ============================================

async function loadEmailSettings() {
    try {
        const data = await apiRequest('/api/admin/settings/email/');
        
        if (data.settings) {
            const smtpHost = document.getElementById('smtpHost');
            const smtpPort = document.getElementById('smtpPort');
            const smtpUser = document.getElementById('smtpUser');
            
            if (smtpHost) smtpHost.value = data.settings.smtp_host || 'smtp.gmail.com';
            if (smtpPort) smtpPort.value = data.settings.smtp_port || '587';
            if (smtpUser) smtpUser.value = data.settings.smtp_user || '';
        }
    } catch (error) {
        console.error('Error loading email settings:', error);
    }
}

async function saveEmailSettings(event) {
    event.preventDefault();
    
    const formData = {
        smtp_host: document.getElementById('smtpHost')?.value || '',
        smtp_port: document.getElementById('smtpPort')?.value || '587',
        smtp_user: document.getElementById('smtpUser')?.value || '',
        smtp_password: document.getElementById('smtpPassword')?.value || ''
    };
    
    Loader.show('Saving email settings...');
    
    try {
        await apiRequest('/api/admin/settings/email/', 'POST', formData);
        showToast('Email settings saved successfully', 'success');
        
        // Clear password field after save for security
        const smtpPassword = document.getElementById('smtpPassword');
        if (smtpPassword) smtpPassword.value = '';
    } catch (error) {
        console.error('Error saving email settings:', error);
        showToast('Failed to save email settings', 'error');
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
            const twoFactorAuth = document.getElementById('twoFactorAuth');
            const requireEmailVerification = document.getElementById('requireEmailVerification');
            const sessionTimeout = document.getElementById('sessionTimeout');
            const maxLoginAttempts = document.getElementById('maxLoginAttempts');
            const apiKey = document.getElementById('apiKey');
            
            if (twoFactorAuth) twoFactorAuth.checked = data.settings.two_factor_auth || false;
            if (requireEmailVerification) requireEmailVerification.checked = data.settings.require_email_verification || false;
            if (sessionTimeout) sessionTimeout.value = data.settings.session_timeout || 30;
            if (maxLoginAttempts) maxLoginAttempts.value = data.settings.max_login_attempts || 5;
            if (apiKey) apiKey.value = data.settings.api_key || 'Loading...';
        }
    } catch (error) {
        console.error('Error loading security settings:', error);
    }
}

async function saveSecuritySettings(event) {
    event.preventDefault();
    
    const formData = {
        two_factor_auth: document.getElementById('twoFactorAuth')?.checked || false,
        require_email_verification: document.getElementById('requireEmailVerification')?.checked || false,
        session_timeout: parseInt(document.getElementById('sessionTimeout')?.value) || 30
    };
    
    Loader.show('Saving security settings...');
    
    try {
        await apiRequest('/api/admin/settings/security/', 'POST', formData);
        showToast('Security settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving security settings:', error);
        showToast('Failed to save security settings', 'error');
    } finally {
        Loader.hide();
    }
}

async function saveIndividualSecuritySettings(event) {
    event.preventDefault();
    
    const formData = {
        two_factor_auth: document.getElementById('twoFactorAuth')?.checked || false,
        require_email_verification: document.getElementById('requireEmailVerification')?.checked || false,
        session_timeout: parseInt(document.getElementById('sessionTimeout')?.value) || 30,
        max_login_attempts: parseInt(document.getElementById('maxLoginAttempts')?.value) || 5
    };
    
    Loader.show('Saving security settings...');
    
    try {
        await apiRequest('/api/admin/settings/security/', 'POST', formData);
        showToast('Security settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving security settings:', error);
        showToast('Failed to save security settings', 'error');
    } finally {
        Loader.hide();
    }
}

// ============================================
// API KEY MANAGEMENT
// ============================================

async function regenerateApiKey() {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will be invalidated immediately.')) {
        return;
    }
    
    Loader.show('Regenerating API key...');
    
    try {
        const data = await apiRequest('/api/admin/settings/regenerate-api-key/', 'POST');
        
        if (data.api_key) {
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = data.api_key;
            }
            showToast('API key regenerated successfully', 'success');
        }
    } catch (error) {
        console.error('Error regenerating API key:', error);
        showToast('Failed to regenerate API key', 'error');
    } finally {
        Loader.hide();
    }
}

// ============================================
// TEST CONNECTIONS
// ============================================

async function testEmailConnection() {
    Loader.show('Testing email connection...');
    
    try {
        const data = await apiRequest('/api/admin/settings/test-email/', 'POST');
        
        if (data.success) {
            showToast('Email connection successful! Test email sent.', 'success');
        } else {
            showToast('Email connection failed: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error testing email:', error);
        showToast('Failed to test email connection', 'error');
    } finally {
        Loader.hide();
    }
}

async function testMpesaConnection() {
    Loader.show('Testing M-Pesa connection...');
    
    try {
        const data = await apiRequest('/api/admin/settings/test-mpesa/', 'POST');
        
        if (data.success) {
            showToast('M-Pesa connection successful!', 'success');
        } else {
            showToast('M-Pesa connection failed: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error testing M-Pesa:', error);
        showToast('Failed to test M-Pesa connection', 'error');
    } finally {
        Loader.hide();
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'success') {
    // Check if global showToast exists
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Fallback toast implementation
    const toast = document.createElement('div');
    toast.className = `settings-toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatKES(amount) {
    return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for global access
window.regenerateApiKey = regenerateApiKey;
window.testEmailConnection = testEmailConnection;
window.testMpesaConnection = testMpesaConnection;