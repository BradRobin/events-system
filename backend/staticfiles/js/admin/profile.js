/* ============================================
   PROFILE JAVASCRIPT - Admin Portal
   EventHub Admin Profile Functionality
   ============================================ */

// Additional profile-specific functionality can be added here
// The main functionality is already in the inline script in profile.html

console.log('Profile JS loaded');

// Optional: Add image upload functionality
function initAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('avatar', file);
                
                Loader.show('Uploading avatar...');
                
                try {
                    const data = await apiRequest('/api/admin/user/upload-avatar/', 'POST', formData, true);
                    if (data.avatar_url) {
                        document.querySelector('.profile-avatar-large span').textContent = '';
                        document.querySelector('.profile-avatar-large').style.backgroundImage = `url(${data.avatar_url})`;
                        showToast('Avatar updated successfully', 'success');
                    }
                } catch (error) {
                    showToast('Failed to upload avatar', 'error');
                } finally {
                    Loader.hide();
                }
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initAvatarUpload();
});
