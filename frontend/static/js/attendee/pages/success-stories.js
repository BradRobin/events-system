// ============================================
// SUCCESS STORIES PAGE - FIXED STARS, PAGINATION, NO EMPTY SPACE
// ============================================

(function() {
    'use strict';
    
    // Strong function to remove ALL loaders from the page
    function removeAllLoaders() {
        const loaderSelectors = [
            '.loader', '#loader', '.loading', '.spinner', '.page-loader', 
            '.loader-spinner', '.loading-spinner', '.overlay-loader',
            '.global-loader', '.main-loader', '.content-loader',
            '[class*="loader"]', '[class*="spinner"]', '[id*="loader"]', '[id*="spinner"]'
        ];
        
        loaderSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) {
                    el.style.display = 'none';
                    el.style.opacity = '0';
                    el.style.visibility = 'hidden';
                }
            });
        });
        
        const overlays = document.querySelectorAll('.loader-overlay, .loading-overlay, .page-overlay');
        overlays.forEach(overlay => {
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        });
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    function initialize() {
        // Remove all loaders immediately
        removeAllLoaders();
        const loaderInterval = setInterval(removeAllLoaders, 50);
        setTimeout(() => clearInterval(loaderInterval), 5000);
        
        console.log('Success Stories initializing - Loaders blocked');
        
        // Default stories data - 12 stories with different ratings
        const DEFAULT_STORIES = [
            {
                id: 1,
                name: 'Yvonne Eshitemi',
                email: 'yvonne@example.com',
                role: 'Event Enthusiast',
                rating: 5,
                message: 'EventHub made it so easy to discover and book tickets for amazing events in Nairobi. The QR code check-in was seamless!',
                event: 'Music Festival 2024',
                avatar: 'https://randomuser.me/api/portraits/women/16.jpg',
                isDefault: true
            },
            {
                id: 2,
                name: 'Wilson Thoma',
                email: 'wilson@example.com',
                role: 'Regular Attendee',
                rating: 5,
                message: 'I\'ve attended over 20 events through EventHub. The platform is reliable, and customer support is exceptional!',
                event: '20+ Events',
                avatar: 'https://randomuser.me/api/portraits/men/80.jpg',
                isDefault: true
            },
            {
                id: 3,
                name: 'Scholasticah Mutuku',
                email: 'scholasticah@example.com',
                role: 'Adventure Seeker',
                rating: 5,
                message: 'Best event discovery platform in Kenya! The variety of events and ease of booking is unmatched.',
                event: 'Cultural Fest 2024',
                avatar: 'https://randomuser.me/api/portraits/women/89.jpg',
                isDefault: true
            },
            {
                id: 4,
                name: 'Brad Omwamba',
                email: 'brad@example.com',
                role: 'Event Organizer',
                rating: 5,
                message: 'As an event organizer, EventHub helped us sell out our event in record time. The support team is amazing!',
                event: 'Tech Summit 2024',
                avatar: 'https://randomuser.me/api/portraits/men/70.jpg',
                isDefault: true
            },
            {
                id: 5,
                name: 'Bullim Njeri',
                email: 'bullim@example.com',
                role: 'Mobile User',
                rating: 5,
                message: 'The mobile app is fantastic! I can browse, book, and check-in using my phone. No more paper tickets!',
                event: 'Food Festival 2024',
                avatar: 'https://randomuser.me/api/portraits/women/90.jpg',
                isDefault: true
            },
            {
                id: 6,
                name: 'Toji Mraster',
                email: 'toji@example.com',
                role: 'First-time User',
                rating: 5,
                message: 'The customer service team went above and beyond to help me with a booking issue. Exceptional service!',
                event: 'Business Forum',
                avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
                isDefault: true
            },
            {
                id: 7,
                name: 'Stacy Naomi',
                email: 'stacy@example.com',
                role: 'Entrepreneur',
                rating: 5,
                message: 'The networking opportunities through EventHub\'s business events have been invaluable for my startup!',
                event: 'Business Summit 2024',
                avatar: 'https://randomuser.me/api/portraits/women/69.jpg',
                isDefault: true
            },
            {
                id: 8,
                name: 'Frank Maina',
                email: 'frank@example.com',
                role: 'Sports Fan',
                rating: 5,
                message: 'Getting tickets for major sports events has never been easier. EventHub is a game-changer for sports fans!',
                event: 'Marathon 2024',
                avatar: 'https://randomuser.me/api/portraits/men/16.jpg',
                isDefault: true
            },
            {
                id: 9,
                name: 'Dev Ndung\'u',
                email: 'dev@example.com',
                role: 'Foodie',
                rating: 5,
                message: 'The food festivals and culinary events I found on EventHub were incredible. Can\'t wait for more!',
                event: 'Food Festival 2024',
                avatar: 'https://randomuser.me/api/portraits/women/92.jpg',
                isDefault: true
            },
            {
                id: 10,
                name: 'Catherine Cherop',
                email: 'catherine@example.com',
                role: 'Art Lover',
                rating: 5,
                message: 'Thanks to EventHub, I discovered amazing art exhibitions I would have otherwise missed. Great platform!',
                event: 'Art Exhibition 2024',
                avatar: 'https://randomuser.me/api/portraits/women/62.jpg',
                isDefault: true
            },
            {
                id: 11,
                name: 'Brian Odhiambo',
                email: 'brian@example.com',
                role: 'Music Producer',
                rating: 5,
                message: 'EventHub has transformed how I discover local talent and music events. Absolutely love the platform!',
                event: 'Music Concert 2024',
                avatar: 'https://randomuser.me/api/portraits/men/25.jpg',
                isDefault: true
            },
            {
                id: 12,
                name: 'Edwin Nyambane',
                email: 'edwin@example.com',
                role: 'Tech Enthusiast',
                rating: 5,
                message: 'The best event platform in Kenya! I\'ve discovered so many tech events and networking opportunities.',
                event: 'Tech Summit 2024',
                avatar: 'https://randomuser.me/api/portraits/men/54.jpg',
                isDefault: true
            }
        ];
        
        // Application state
        let allStories = [];
        let currentPage = 1;
        const STORIES_PER_PAGE = 3;
        let userHasStory = false;
        let currentUserStoryId = null;

        const STORY_API = {
            list: '/api/customer-stories/',
            mine: '/api/attendee/customer-stories/mine/',
            create: '/api/attendee/customer-stories/',
            delete: '/api/attendee/customer-stories/delete/',
        };
        
        // DOM elements
        const storiesGrid = document.getElementById('testimonialsGrid');
        const loadMoreBtn = document.getElementById('readMoreBtn');
        const shareBtn = document.getElementById('shareStoryBtn');
        const loginToShareBtn = document.getElementById('loginToShareBtn');
        const modal = document.getElementById('storyModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const storyForm = document.getElementById('storyForm');
        
        // Helper functions
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Generate stars based on rating
        function generateStars(rating) {
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= rating) {
                    starsHtml += '<i class="fas fa-star"></i>';
                } else {
                    starsHtml += '<i class="far fa-star"></i>';
                }
            }
            return starsHtml;
        }
        
        function isAuthenticated() {
            try {
                const token = localStorage.getItem('attendee_access_token');
                const user = localStorage.getItem('attendee_user');
                const expiry = localStorage.getItem('attendee_token_expiry');
                if (!token || !user) return false;
                if (expiry && Date.now() > parseInt(expiry, 10)) return false;
                return true;
            } catch (e) {
                return false;
            }
        }

        function getAuthHeaders() {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            const token = localStorage.getItem('attendee_access_token');
            if (token) {
                headers.Authorization = 'Bearer ' + token;
            }
            return headers;
        }

        function getCurrentUserEmail() {
            if (!isAuthenticated()) return null;
            try {
                const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
                if (user && user.email) {
                    return user.email.toLowerCase().trim();
                }
            } catch(e) {
                console.error('Error getting user:', e);
            }
            return null;
        }
        
        // Load stories: featured defaults + user-submitted from API
        async function loadData() {
            allStories = [...DEFAULT_STORIES];

            try {
                const response = await fetch(STORY_API.list, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });
                if (response.ok) {
                    const data = await response.json();
                    const userStories = (data.stories || []).map(function (story) {
                        return Object.assign({}, story, { isDefault: false });
                    });
                    const defaultEmails = new Set(
                        DEFAULT_STORIES.map(function (s) { return (s.email || '').toLowerCase(); })
                    );
                    userStories.forEach(function (story) {
                        if (!defaultEmails.has((story.email || '').toLowerCase())) {
                            allStories.unshift(story);
                        }
                    });
                }
            } catch (err) {
                console.warn('[success-stories] Could not load user stories:', err);
            }

            await refreshUserStoryState();
            console.log('Loaded stories:', allStories.length);
        }

        async function refreshUserStoryState() {
            userHasStory = false;
            currentUserStoryId = null;

            if (!isAuthenticated()) return;

            try {
                const response = await fetch(STORY_API.mine, {
                    headers: getAuthHeaders(),
                    credentials: 'same-origin',
                });
                if (response.status === 401) return;
                if (!response.ok) return;

                const data = await response.json();
                if (data.story) {
                    userHasStory = true;
                    currentUserStoryId = data.story.id;
                }
            } catch (err) {
                console.warn('[success-stories] Could not load user story state:', err);
            }
        }
        
        // Create story card
        function createStoryCard(story) {
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.setAttribute('data-id', story.id);
            
            const currentUserEmail = getCurrentUserEmail();
            const isOwnStory = !story.isDefault && (
                (currentUserStoryId && story.id === currentUserStoryId) ||
                (currentUserEmail && story.email && story.email.toLowerCase() === currentUserEmail)
            );
            
            const badge = story.isDefault ? 
                '<span class="default-badge"><i class="fas fa-star-of-life"></i> Featured Story</span>' : 
                '<span class="user-badge"><i class="fas fa-user-plus"></i> Your Story</span>';
            
            const deleteButton = isOwnStory ? 
                `<button class="delete-story-btn" data-id="${story.id}" data-email="${escapeHtml(story.email)}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>` : '';
            
            const starsHtml = generateStars(story.rating);
            
            card.innerHTML = `
                <div class="testimonial-header">
                    <i class="fas fa-quote-left quote-icon"></i>
                    <div class="rating">${starsHtml}</div>
                </div>
                <p class="testimonial-text">${escapeHtml(story.message)}</p>
                <div class="testimonial-author">
                    <div class="author-avatar">
                        ${story.avatar ? `<img src="${story.avatar}" alt="${story.name}">` : '<i class="fas fa-user-circle"></i>'}
                    </div>
                    <div class="author-info">
                        <h4>${escapeHtml(story.name)}</h4>
                        <p>${escapeHtml(story.role)}</p>
                        ${story.event ? `<p class="event-attended">📌 ${escapeHtml(story.event)}</p>` : ''}
                    </div>
                </div>
                <div class="story-footer">
                    <div class="story-badge-container">${badge}</div>
                    ${deleteButton}
                </div>
            `;
            
            if (isOwnStory) {
                const deleteBtn = card.querySelector('.delete-story-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteStory(story.id, story.email);
                    });
                }
            }
            
            return card;
        }
        
        async function deleteStory(storyId, storyEmail) {
            if (!isAuthenticated()) {
                showToast('Please login to delete your story', 'error');
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }

            const currentUserEmail = getCurrentUserEmail();
            if (!currentUserEmail || storyEmail.toLowerCase() !== currentUserEmail) {
                showToast('You can only delete your own stories!', 'error');
                return;
            }

            const storyToDelete = allStories.find(s => s.id === storyId);
            if (storyToDelete && storyToDelete.isDefault) {
                showToast('Featured stories cannot be deleted!', 'error');
                return;
            }

            try {
                const response = await fetch(STORY_API.delete, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    credentials: 'same-origin',
                    body: '{}',
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    showToast(data.message || 'Could not delete your story', 'error');
                    return;
                }

                allStories = allStories.filter(s => s.id !== storyId);
                userHasStory = false;
                currentUserStoryId = null;

                const totalPages = Math.ceil(allStories.length / STORIES_PER_PAGE);
                if (currentPage > totalPages && totalPages > 0) {
                    currentPage = totalPages;
                }
                if (currentPage < 1) currentPage = 1;

                renderStories();
                updateShareButtonState();
                showToast('Your story has been deleted! You can now submit a new story.', 'success');
            } catch (error) {
                console.error('Delete story failed:', error);
                showToast('Could not delete your story. Please try again.', 'error');
            }
        }
        
        // Get total pages
        function getTotalPages() {
            return Math.ceil(allStories.length / STORIES_PER_PAGE);
        }
        
        // Render stories
        function renderStories() {
            if (!storiesGrid) return;
            
            storiesGrid.innerHTML = '';
            
            if (allStories.length === 0) {
                storiesGrid.innerHTML = '<div class="empty-message"><i class="fas fa-comment-dots"></i> No stories yet. Be the first to share!</div>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }
            
            if (loadMoreBtn) loadMoreBtn.style.display = 'inline-flex';
            
            const start = (currentPage - 1) * STORIES_PER_PAGE;
            const end = start + STORIES_PER_PAGE;
            const pageStories = allStories.slice(start, end);
            
            pageStories.forEach(story => {
                storiesGrid.appendChild(createStoryCard(story));
            });
            
            updatePaginationButton();
            updatePaginationInfo(start, end);
        }
        
        function updatePaginationButton() {
            if (!loadMoreBtn) return;
            
            const totalPages = getTotalPages();
            
            if (totalPages <= 1) {
                loadMoreBtn.innerHTML = `<i class="fas fa-book-open"></i> Load More`;
                loadMoreBtn.disabled = true;
                loadMoreBtn.style.opacity = '0.5';
                loadMoreBtn.style.cursor = 'not-allowed';
            } else if (currentPage < totalPages) {
                loadMoreBtn.innerHTML = `<i class="fas fa-book-open"></i> Load More (${currentPage + 1}/${totalPages})`;
                loadMoreBtn.disabled = false;
                loadMoreBtn.style.opacity = '1';
                loadMoreBtn.style.cursor = 'pointer';
            } else {
                loadMoreBtn.innerHTML = `<i class="fas fa-redo-alt"></i> Start Over (Page 1)`;
                loadMoreBtn.disabled = false;
                loadMoreBtn.style.opacity = '1';
                loadMoreBtn.style.cursor = 'pointer';
            }
        }
        
        function updatePaginationInfo(start, end) {
            let info = document.querySelector('.pagination-info');
            if (!info && storiesGrid && storiesGrid.parentNode) {
                info = document.createElement('div');
                info.className = 'pagination-info';
                storiesGrid.parentNode.insertBefore(info, storiesGrid.nextSibling);
            }
            if (info) {
                const userStoriesCount = allStories.filter(s => !s.isDefault).length;
                info.innerHTML = `Showing ${Math.min(start + 1, allStories.length)}-${Math.min(end, allStories.length)} of ${allStories.length} stories (${userStoriesCount} by users)`;
            }
        }
        
        function nextPage() {
            const totalPages = getTotalPages();
            
            if (totalPages <= 1) {
                showToast('No more stories to load', 'info');
                return;
            }
            
            if (currentPage < totalPages) {
                currentPage++;
                renderStories();
                if (storiesGrid) {
                    storiesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                currentPage = 1;
                renderStories();
                if (storiesGrid) {
                    storiesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                showToast('Showing first page of stories', 'info');
            }
        }
        
        // Add new story (authenticated API)
        async function addNewStory(storyData) {
            if (!isAuthenticated()) {
                showToast('Please login to share your story', 'error');
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return false;
            }

            if (userHasStory) {
                showToast('You have already shared a story! Delete your existing story first to submit a new one.', 'error');
                return false;
            }

            try {
                const response = await fetch(STORY_API.create, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        name: storyData.name,
                        message: storyData.message,
                        event: storyData.event || '',
                        rating: storyData.rating,
                    }),
                });

                const data = await response.json().catch(() => ({}));

                if (response.status === 401) {
                    showToast('Your session has expired. Please sign in again.', 'error');
                    window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                    return false;
                }

                if (!response.ok) {
                    showToast(data.message || 'Could not publish your story', 'error');
                    return false;
                }

                const newStory = Object.assign({}, data.story, { isDefault: false });
                allStories = allStories.filter(function (s) {
                    return !(s.email && newStory.email && s.email.toLowerCase() === newStory.email.toLowerCase() && !s.isDefault);
                });
                allStories.unshift(newStory);
                userHasStory = true;
                currentUserStoryId = newStory.id;

                currentPage = 1;
                renderStories();

                setTimeout(function () {
                    if (storiesGrid) {
                        storiesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        const firstCard = document.querySelector('.testimonial-card');
                        if (firstCard) {
                            firstCard.style.transition = 'all 0.3s ease';
                            firstCard.style.boxShadow = '0 0 0 3px #f59e0b';
                            setTimeout(function () {
                                if (firstCard) firstCard.style.boxShadow = '';
                            }, 2000);
                        }
                    }
                }, 100);

                showToast('Your story has been published successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Submit story failed:', error);
                showToast('Could not publish your story. Please try again.', 'error');
                return false;
            }
        }
        
        // Update share / login button state
        function updateShareButtonState() {
            const loggedIn = isAuthenticated();

            if (loginToShareBtn) {
                loginToShareBtn.style.display = loggedIn ? 'none' : 'inline-flex';
            }

            if (!shareBtn) return;

            if (!loggedIn) {
                shareBtn.style.display = 'none';
                return;
            }

            shareBtn.style.display = 'inline-flex';

            if (userHasStory) {
                shareBtn.disabled = true;
                shareBtn.style.opacity = '0.5';
                shareBtn.style.cursor = 'not-allowed';
                shareBtn.title = 'You have already shared a story. Delete it first to submit a new one.';
            } else {
                shareBtn.disabled = false;
                shareBtn.style.opacity = '1';
                shareBtn.style.cursor = 'pointer';
                shareBtn.title = 'Share your story';
            }
        }
        
        // Modal functions
        function openModal() {
            if (!isAuthenticated()) {
                showToast('Please login to share your story', 'error');
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }

            if (userHasStory) {
                showToast('You have already shared a story! Delete your existing story first to submit a new one.', 'error');
                return;
            }
            
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';

                const currentUserEmail = getCurrentUserEmail();
                const emailInput = document.getElementById('storyEmail');
                if (emailInput) {
                    emailInput.value = currentUserEmail;
                    emailInput.readOnly = true;
                }
                
                const nameInput = document.getElementById('storyName');
                if (nameInput) nameInput.value = '';
                
                const eventInput = document.getElementById('storyEvent');
                if (eventInput) eventInput.value = '';
                
                const messageInput = document.getElementById('storyMessage');
                if (messageInput) messageInput.value = '';
                
                const ratingInput = document.getElementById('storyRating');
                if (ratingInput) ratingInput.value = '0';
                
                const stars = document.querySelectorAll('.rating-input i');
                stars.forEach(star => {
                    star.classList.remove('fas');
                    star.classList.add('far');
                });
                
                try {
                    const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
                    if (user.first_name && nameInput) {
                        const fullName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
                        nameInput.value = fullName;
                    }
                } catch(e) {}
            }
        }
        
        function closeModal() {
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                if (storyForm) storyForm.reset();
                
                const ratingInput = document.getElementById('storyRating');
                if (ratingInput) ratingInput.value = '0';
                
                const stars = document.querySelectorAll('.rating-input i');
                stars.forEach(star => {
                    star.classList.remove('fas');
                    star.classList.add('far');
                });
            }
        }
        
        // Toast notification
        function showToast(message, type = 'success') {
            const existingToast = document.querySelector('.toast-notification');
            if (existingToast) existingToast.remove();
            
            const toast = document.createElement('div');
            toast.className = `toast-notification ${type}`;
            const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
            toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 3000);
        }
        
        // Rating stars setup for form
        function setupRatingStars() {
            const stars = document.querySelectorAll('.rating-input i');
            const ratingInput = document.getElementById('storyRating');
            
            if (!stars.length) return;
            
            stars.forEach(star => {
                star.addEventListener('click', function() {
                    const rating = parseInt(this.dataset.rating);
                    if (ratingInput) ratingInput.value = rating;
                    
                    stars.forEach((s, index) => {
                        if (index < rating) {
                            s.classList.remove('far');
                            s.classList.add('fas');
                        } else {
                            s.classList.remove('fas');
                            s.classList.add('far');
                        }
                    });
                });
            });
        }
        
        // Platform stats pipeline — fetch live counts then animate
        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function animateCounter(el) {
            const target = parseInt(el.getAttribute('data-target'), 10) || 0;
            const duration = 2000;
            let startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeOutExpo(progress);
                el.textContent = Math.floor(eased * target).toLocaleString();

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target.toLocaleString();
                }
            }

            requestAnimationFrame(step);
        }

        function observeStats(counters) {
            if (!counters.length) return;

            const statsBar = document.getElementById('platformStatsBar') || counters[0].closest('.stats-bar');
            if (!statsBar) return;

            let animated = false;
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting && !animated) {
                        animated = true;
                        counters.forEach(animateCounter);
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.25 });

            observer.observe(statsBar);
        }

        function loadPlatformStats() {
            const counters = Array.from(document.querySelectorAll('.stats-bar .counter[data-stat]'));
            if (!counters.length) return;

            fetch('/api/platform/stats/')
                .then(function(res) {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.json();
                })
                .then(function(data) {
                    if (!data.success) throw new Error('API returned failure');

                    counters.forEach(function(el) {
                        const key = el.getAttribute('data-stat');
                        if (data[key] !== undefined && data[key] !== null) {
                            el.setAttribute('data-target', data[key]);
                        }
                    });
                })
                .catch(function(err) {
                    console.warn('[success-stories] Using server-rendered stats fallback:', err);
                })
                .finally(function() {
                    observeStats(counters);
                });
        }
        
        // Form submission
        if (storyForm) {
            storyForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (!isAuthenticated()) {
                    showToast('Please login to share your story', 'error');
                    window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                    return;
                }
                
                const nameInput = document.getElementById('storyName');
                const emailInput = document.getElementById('storyEmail');
                const eventInput = document.getElementById('storyEvent');
                const ratingInput = document.getElementById('storyRating');
                const messageInput = document.getElementById('storyMessage');
                
                const name = nameInput?.value.trim();
                const email = emailInput?.value.trim();
                const eventName = eventInput?.value.trim();
                const rating = ratingInput?.value;
                const message = messageInput?.value.trim();
                
                if (!name) {
                    showToast('Please enter your name', 'error');
                    return;
                }
                if (!email) {
                    showToast('Please enter your email', 'error');
                    return;
                }
                if (!rating || rating === '0') {
                    showToast('Please select a rating', 'error');
                    return;
                }
                if (!message || message.length < 10) {
                    showToast('Please enter your story (minimum 10 characters)', 'error');
                    return;
                }
                
                const success = await addNewStory({
                    name: name,
                    email: email,
                    event: eventName,
                    rating: parseInt(rating, 10),
                    message: message
                });
                
                if (success) {
                    closeModal();
                    updateShareButtonState();
                }
            });
        }
        
        // Event listeners
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', nextPage);
        }
        
        if (shareBtn) {
            shareBtn.addEventListener('click', openModal);
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }
        
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeModal();
            });
        }
        
        window.addEventListener('auth-state-changed', async function() {
            await loadData();
            renderStories();
            updateShareButtonState();
        });

        // Initialize
        (async function initStoriesPage() {
            if (loginToShareBtn) {
                loginToShareBtn.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
            }
            await loadData();
            renderStories();
            updateShareButtonState();
            setupRatingStars();
            loadPlatformStats();
            console.log('Success Stories initialized with', allStories.length, 'stories');
        })();
    }
})();