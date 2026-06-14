// frontend/static/js/organizer/settings.js
async function loadGeneral() {
    try {
        const g = await OrganizerAPI.settings.getGeneral();
        document.getElementById('orgName').value = g.organization_name || '';
        document.getElementById('orgEmail').value = g.email || '';
        document.getElementById('orgPhone').value = g.phone || '';
        document.getElementById('orgWebsite').value = g.website || '';
        document.getElementById('orgBio').value = g.bio || '';
    } catch(e) {}
}

async function saveGeneral(e) {
    e.preventDefault();
    const data = {
        organization_name: document.getElementById('orgName').value,
        email: document.getElementById('orgEmail').value,
        phone: document.getElementById('orgPhone').value,
        website: document.getElementById('orgWebsite').value,
        bio: document.getElementById('orgBio').value
    };
    try {
        await OrganizerAPI.settings.updateGeneral(data);
        if(window.showToast) window.showToast('Settings saved', 'success');
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function loadMpesaSettings() {
    try {
        const m = await OrganizerAPI.settings.getMpesa();
        document.getElementById('mpesaDisplayName').value = m.mpesa_display_name || '';
        document.getElementById('mpesaPaybill').value = m.mpesa_paybill || '';
        document.getElementById('mpesaTill').value = m.mpesa_till || '';
        document.getElementById('mpesaPochi').value = m.mpesa_pochi || '';
        document.getElementById('mpesaSendMoney').value = m.mpesa_send_money || '';
    } catch(e) {}
}

async function saveMpesa(e) {
    e.preventDefault();
    const data = {
        mpesa_display_name: document.getElementById('mpesaDisplayName').value,
        mpesa_paybill: document.getElementById('mpesaPaybill').value,
        mpesa_till: document.getElementById('mpesaTill').value,
        mpesa_pochi: document.getElementById('mpesaPochi').value,
        mpesa_send_money: document.getElementById('mpesaSendMoney').value,
    };
    try {
        await OrganizerAPI.settings.updateMpesa(data);
        if(window.showToast) window.showToast('M-Pesa settings saved', 'success');
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function loadPaymentSettings() {
    try {
        const p = await OrganizerAPI.payouts.getSettings();
        document.getElementById('bankAccount').value = p.account_number || '';
        document.getElementById('bankNameSetting').value = p.bank_name || '';
        document.getElementById('accountHolderSetting').value = p.account_holder || '';
        document.getElementById('routingNumber').value = p.routing_number || '';
    } catch(e) {}
}

async function savePayment(e) {
    e.preventDefault();
    const data = {
        account_number: document.getElementById('bankAccount').value,
        bank_name: document.getElementById('bankNameSetting').value,
        account_holder: document.getElementById('accountHolderSetting').value,
        routing_number: document.getElementById('routingNumber').value
    };
    try {
        await OrganizerAPI.payouts.updateSettings(data);
        if(window.showToast) window.showToast('Payment settings saved', 'success');
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function loadTeam() {
    try {
        const team = await OrganizerAPI.settings.getTeam();
        const container = document.getElementById('teamList');
        if (!team.length) { container.innerHTML = '<p class="text-muted">No team members</p>'; return; }
        container.innerHTML = team.map(m => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div><strong>${escapeHtml(m.email)}</strong> (${m.role})</div>
                <button class="btn btn-sm btn-outline-danger remove-team" data-id="${m.id}">Remove</button>
            </div>
        `).join('');
        document.querySelectorAll('.remove-team').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Remove this team member?')) {
                    await OrganizerAPI.settings.removeTeamMember(btn.dataset.id);
                    loadTeam();
                }
            });
        });
    } catch(e) {}
}

async function addTeamMember() {
    const email = document.getElementById('teamEmail').value.trim();
    const role = document.getElementById('teamRole').value;
    if (!email) { alert('Enter email'); return; }
    try {
        await OrganizerAPI.settings.addTeamMember(email, role);
        if(window.showToast) window.showToast('Member added', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
        loadTeam();
    } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
}

async function loadApiKeys() {
    try {
        const keys = await OrganizerAPI.settings.getApiKeys();
        const container = document.getElementById('apiKeysList');
        if (!keys.length) { container.innerHTML = '<p class="text-muted">No API keys</p>'; return; }
        container.innerHTML = keys.map(k => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div><code>${escapeHtml(k.name)}</code><br><small>Created: ${new Date(k.created_at).toLocaleDateString()}</small></div>
                <button class="btn btn-sm btn-outline-danger revoke-key" data-id="${k.id}">Revoke</button>
            </div>
        `).join('');
        document.querySelectorAll('.revoke-key').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Revoke this API key?')) {
                    await OrganizerAPI.settings.revokeApiKey(btn.dataset.id);
                    loadApiKeys();
                }
            });
        });
    } catch(e) {}
}

async function createApiKey() {
    const name = prompt('Enter a name for this API key:');
    if (name) {
        try {
            const key = await OrganizerAPI.settings.createApiKey(name);
            alert(`Your new API key: ${key.key}\nCopy it now, it will not be shown again.`);
            loadApiKeys();
        } catch(e) { if(window.showToast) window.showToast(e.message, 'error'); }
    }
}

document.getElementById('generalForm')?.addEventListener('submit', saveGeneral);
document.getElementById('mpesaForm')?.addEventListener('submit', saveMpesa);
document.getElementById('paymentForm')?.addEventListener('submit', savePayment);
document.getElementById('addTeamBtn')?.addEventListener('click', addTeamMember);
document.getElementById('createApiKeyBtn')?.addEventListener('click', createApiKey);

document.addEventListener('DOMContentLoaded', () => {
    loadGeneral();
    loadMpesaSettings();
    loadPaymentSettings();
    loadTeam();
    loadApiKeys();
});