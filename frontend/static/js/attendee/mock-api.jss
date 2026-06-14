// ============================================
// MOCK API - Complete Dummy Data
// Intercepts all API calls and returns mock data
// ============================================

(function() {
    'use strict';
    
    // Check if mock should be enabled (from config)
    const shouldUseMock = window.ATTENDEE_API_CONFIG && window.ATTENDEE_API_CONFIG.USE_MOCK === true;
    
    if (!shouldUseMock) {
        console.log('%c[Mock API] Disabled - using real API', 'color: #64748b;');
        return;
    }
    
    console.log('%c[Mock API] Enabled - Using mock event data', 'color: #10b981; font-weight: bold;');
    
    // ============================================
    // MOCK EVENTS DATA
    // ============================================
    const MOCK_EVENTS = [
        {
            id: 101,
            title: "Afrobeat Music Festival 2024",
            description: "The biggest Afrobeat music festival in Nairobi featuring top artists from across Africa. Experience electrifying performances, amazing food, and unforgettable moments.",
            category_name: "Music",
            category_slug: "music",
            date: "2024-12-15",
            time: "18:00",
            location: "Uhuru Gardens, Nairobi",
            venue: "Uhuru Gardens",
            price: 2500,
            original_price: 3500,
            vip_price: 5000,
            vvip_price: 10000,
            available_tickets: 450,
            image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
            is_featured: true,
            featured: true,
            features: ["Live Bands", "Food Vendors", "VIP Lounge", "Free Parking", "Security Check"],
            organizer: "Afrobeat Events Kenya",
            organizer_name: "Afrobeat Events Kenya",
            organizer_email: "events@afrobeat.co.ke",
            organizer_phone: "+254700123456",
            parking_available: true,
            wheelchair_accessible: true,
            refund_policy: "Full refund if canceled 7 days before event",
            rating: 4.8,
            rating_count: 156
        },
        {
            id: 102,
            title: "Tech Summit Nairobi 2024",
            description: "Join Kenya's largest tech conference featuring speakers from Google, Microsoft, and local tech leaders.",
            category_name: "Technology",
            category_slug: "tech",
            date: "2024-11-20",
            time: "09:00",
            location: "KICC, Nairobi",
            venue: "Kenyatta International Convention Centre",
            price: 3500,
            original_price: 5000,
            vip_price: 7500,
            vvip_price: 12000,
            available_tickets: 280,
            image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            is_featured: true,
            featured: true,
            features: ["Workshops", "Keynote Speakers", "Networking Session", "Exhibition Booths", "Lunch Included"],
            organizer: "TechEvents Kenya",
            organizer_name: "TechEvents Kenya",
            organizer_email: "info@techevents.co.ke",
            organizer_phone: "+254711234567",
            parking_available: true,
            wheelchair_accessible: true,
            refund_policy: "50% refund up to 14 days before event",
            rating: 4.6,
            rating_count: 89
        },
        {
            id: 103,
            title: "Food & Wine Experience",
            description: "A culinary journey through Kenya's finest cuisine. Sample dishes from top chefs, enjoy wine tastings.",
            category_name: "Food",
            category_slug: "food",
            date: "2024-12-05",
            time: "14:00",
            location: "Sarit Centre, Nairobi",
            venue: "Sarit Expo Hall",
            price: 1800,
            original_price: 2500,
            vip_price: 3500,
            available_tickets: 320,
            image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
            is_featured: false,
            featured: false,
            features: ["Wine Tasting", "Cooking Demos", "Chef Meet & Greet", "Recipe Book"],
            organizer: "Gourmet Events",
            organizer_name: "Gourmet Events",
            organizer_email: "hello@gourmet.co.ke",
            organizer_phone: "+254722334455",
            parking_available: true,
            wheelchair_accessible: true,
            refund_policy: "No refunds. Tickets are transferable.",
            rating: 4.5,
            rating_count: 67
        },
        {
            id: 104,
            title: "Comedy Night with Eric Omondi",
            description: "A night of laughter with Kenya's top comedians. Headlined by Eric Omondi.",
            category_name: "Comedy",
            category_slug: "comedy",
            date: "2024-11-30",
            time: "19:30",
            location: "KICC, Nairobi",
            venue: "Tsavo Ballroom",
            price: 1500,
            original_price: 2000,
            vip_price: 3000,
            available_tickets: 500,
            image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
            is_featured: true,
            featured: true,
            features: ["Open Bar", "Meet & Greet", "Free Parking"],
            organizer: "Laugh Out Loud Productions",
            organizer_name: "Laugh Out Loud Productions",
            organizer_email: "bookings@lol.co.ke",
            organizer_phone: "+254733445566",
            parking_available: true,
            wheelchair_accessible: true,
            refund_policy: "No refunds",
            rating: 4.9,
            rating_count: 234
        },
        {
            id: 105,
            title: "Wellness & Yoga Retreat",
            description: "A weekend of relaxation, yoga, meditation, and wellness workshops.",
            category_name: "Wellness",
            category_slug: "wellness",
            date: "2024-12-08",
            time: "08:00",
            location: "Tigoni, Limuru",
            venue: "The Retreat Centre",
            price: 4500,
            original_price: 6000,
            available_tickets: 85,
            image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
            is_featured: false,
            featured: false,
            features: ["Yoga Sessions", "Meditation", "Healthy Meals", "Accommodation"],
            organizer: "Wellness Kenya",
            organizer_name: "Wellness Kenya",
            organizer_email: "info@wellness.co.ke",
            organizer_phone: "+254744556677",
            parking_available: true,
            wheelchair_accessible: false,
            refund_policy: "Full refund up to 21 days before event",
            rating: 4.7,
            rating_count: 45
        },
        {
            id: 106,
            title: "Art Exhibition: Modern African Art",
            description: "Showcasing contemporary African artists. Paintings, sculptures, and digital art.",
            category_name: "Art",
            category_slug: "art",
            date: "2024-11-25",
            time: "10:00",
            location: "Nairobi National Museum",
            venue: "Museum Gallery",
            price: 800,
            original_price: 1200,
            available_tickets: 200,
            image: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800",
            is_featured: false,
            featured: false,
            features: ["Artist Talks", "Wine Reception", "Art for Sale"],
            organizer: "Nairobi Art Collective",
            organizer_name: "Nairobi Art Collective",
            organizer_email: "art@collective.co.ke",
            organizer_phone: "+254755667788",
            parking_available: true,
            wheelchair_accessible: true,
            refund_policy: "No refunds",
            rating: 4.4,
            rating_count: 32
        }
    ];
    
    // ============================================
    // MOCK FEATURED EVENTS (subset for homepage)
    // ============================================
    const MOCK_FEATURED_EVENTS = MOCK_EVENTS.filter(e => e.is_featured === true);
    
    // ============================================
    // MOCK CATEGORIES
    // ============================================
    const MOCK_CATEGORIES = {
        success: true,
        categories: [
            { id: 1, name: "Music", slug: "music", icon: "fa-music", count: 12 },
            { id: 2, name: "Technology", slug: "tech", icon: "fa-laptop-code", count: 8 },
            { id: 3, name: "Food", slug: "food", icon: "fa-utensils", count: 6 },
            { id: 4, name: "Comedy", slug: "comedy", icon: "fa-laugh", count: 4 },
            { id: 5, name: "Wellness", slug: "wellness", icon: "fa-spa", count: 3 },
            { id: 6, name: "Art", slug: "art", icon: "fa-palette", count: 5 },
            { id: 7, name: "Sports", slug: "sports", icon: "fa-futbol", count: 7 },
            { id: 8, name: "Business", slug: "business", icon: "fa-briefcase", count: 9 }
        ]
    };
    
    // ============================================
    // MOCK WISHLIST
    // ============================================
    let mockWishlist = JSON.parse(localStorage.getItem('eventhub_wishlist_mock') || '[]');
    
    function saveWishlist() {
        localStorage.setItem('eventhub_wishlist_mock', JSON.stringify(mockWishlist));
    }
    
    // ============================================
    // MOCK CART
    // ============================================
    let mockCart = JSON.parse(localStorage.getItem('eventhub_cart_mock') || '{"items":[], "subtotal":0, "total":0}');
    
    function saveCart() {
        localStorage.setItem('eventhub_cart_mock', JSON.stringify(mockCart));
    }
    
    // ============================================
    // MOCK PAYMENT ORDERS
    // ============================================
    let mockPaymentOrders = JSON.parse(localStorage.getItem('eventhub_payment_orders_mock') || '[]');
    
    function savePaymentOrders() {
        localStorage.setItem('eventhub_payment_orders_mock', JSON.stringify(mockPaymentOrders));
    }
    
    // ============================================
    // MOCK BOOKINGS/TICKETS
    // ============================================
    let mockBookings = JSON.parse(localStorage.getItem('eventhub_bookings_mock') || '[]');
    
    function saveBookings() {
        localStorage.setItem('eventhub_bookings_mock', JSON.stringify(mockBookings));
    }
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function getEventById(id) {
        return MOCK_EVENTS.find(e => e.id === parseInt(id));
    }
    
    function createResponse(data, status = 200) {
        return Promise.resolve({
            ok: status === 200,
            status: status,
            json: () => Promise.resolve(data)
        });
    }
    
    function createPaymentOrder(orderData) {
        const newOrder = {
            id: Math.floor(Math.random() * 10000),
            checkout_request_id: `CHECKOUT_${Date.now()}`,
            merchant_request_id: `MERCHANT_${Date.now()}`,
            amount: orderData.amount,
            phone_number: orderData.phone_number,
            status: "pending",
            created_at: new Date().toISOString(),
            event_id: orderData.event_id,
            ticket_type: orderData.ticket_type,
            quantity: orderData.quantity
        };
        mockPaymentOrders.push(newOrder);
        savePaymentOrders();
        return newOrder;
    }
    
    // ============================================
    // FETCH INTERCEPTOR
    // ============================================
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
        const urlStr = typeof url === 'string' ? url : url.url;
        
        let urlObj;
        try {
            urlObj = new URL(urlStr, window.location.origin);
        } catch(e) {
            return originalFetch(url, options);
        }
        
        const pathname = urlObj.pathname;
        const method = options.method || 'GET';
        
        console.log(`[Mock] ${method} ${pathname}`);
        
        // ============================================
        // EVENTS LIST: GET /api/attendee/events/
        // ============================================
        if (pathname === '/api/attendee/events/') {
            const search = urlObj.searchParams.get('search');
            const category = urlObj.searchParams.get('category');
            const offset = parseInt(urlObj.searchParams.get('offset') || '0');
            const limit = parseInt(urlObj.searchParams.get('limit') || '12');
            
            let filtered = [...MOCK_EVENTS];
            
            if (search) {
                const searchLower = search.toLowerCase();
                filtered = filtered.filter(e => 
                    e.title.toLowerCase().includes(searchLower) ||
                    e.description.toLowerCase().includes(searchLower)
                );
            }
            
            if (category && category !== 'all') {
                filtered = filtered.filter(e => e.category_slug === category);
            }
            
            const paginated = filtered.slice(offset, offset + limit);
            const hasMore = offset + limit < filtered.length;
            
            return createResponse({
                success: true,
                events: paginated,
                total: filtered.length,
                has_more: hasMore
            });
        }
        
        // ============================================
        // SINGLE EVENT: GET /api/attendee/events/{id}/
        // ============================================
        const eventMatch = pathname.match(/\/api\/attendee\/events\/(\d+)\/$/);
        if (eventMatch) {
            const eventId = parseInt(eventMatch[1]);
            const event = getEventById(eventId);
            
            if (event) {
                return createResponse({ success: true, event: event });
            } else {
                return createResponse({ success: false, message: 'Event not found' }, 404);
            }
        }
        
        // ============================================
        // FEATURED EVENTS: GET /api/attendee/events/featured/
        // ============================================
        if (pathname === '/api/attendee/events/featured/') {
            return createResponse({
                success: true,
                events: MOCK_FEATURED_EVENTS
            });
        }
        
        // ============================================
        // CATEGORIES: GET /api/attendee/categories/
        // ============================================
        if (pathname === '/api/attendee/categories/') {
            return createResponse(MOCK_CATEGORIES);
        }
        
        // ============================================
        // WISHLIST API
        // ============================================
        if (pathname === '/api/attendee/wishlist/') {
            if (method === 'GET') {
                const wishlistEvents = mockWishlist.map(id => ({ event_id: id, id: id }));
                return createResponse({ success: true, wishlist: wishlistEvents });
            }
            
            if (method === 'POST') {
                const body = JSON.parse(options.body || '{}');
                const eventId = body.event_id;
                
                if (!mockWishlist.includes(eventId)) {
                    mockWishlist.push(eventId);
                    saveWishlist();
                }
                
                return createResponse({ success: true, message: 'Added to wishlist' });
            }
        }
        
        // Wishlist check
        if (pathname === '/api/attendee/wishlist/check/') {
            const eventId = parseInt(urlObj.searchParams.get('event_id'));
            return createResponse({ success: true, in_wishlist: mockWishlist.includes(eventId) });
        }
        
        // Wishlist delete
        const wishlistDeleteMatch = pathname.match(/\/api\/attendee\/wishlist\/(\d+)\/$/);
        if (wishlistDeleteMatch && method === 'DELETE') {
            const eventId = parseInt(wishlistDeleteMatch[1]);
            mockWishlist = mockWishlist.filter(id => id !== eventId);
            saveWishlist();
            return createResponse({ success: true, message: 'Removed from wishlist' });
        }
        
        // ============================================
        // PROFILE API
        // ============================================
        if (pathname === '/api/attendee/profile/') {
            const user = JSON.parse(localStorage.getItem('attendee_user') || '{}');
            return createResponse({
                success: true,
                profile: {
                    id: 1,
                    email: user.email || 'test@example.com',
                    first_name: user.first_name || 'Test',
                    last_name: user.last_name || 'User',
                    phone: '+254700000000',
                    date_joined: '2024-01-01'
                }
            });
        }
        
        // ============================================
        // EVENTS CHECK EXPIRED - NEW HANDLER
        // ============================================
        if (pathname === '/api/events/check-expired/') {
            return createResponse({
                success: true,
                expired_events: [],
                message: 'No expired events found'
            });
        }
        
        // ============================================
        // PAYMENT ORDERS CREATE - NEW HANDLER
        // ============================================
        if (pathname === '/api/attendee/payment-orders/create/') {
            const body = JSON.parse(options.body || '{}');
            const newOrder = createPaymentOrder(body);
            return createResponse({
                success: true,
                message: 'Payment order created successfully',
                data: newOrder,
                checkout_request_id: newOrder.checkout_request_id,
                merchant_request_id: newOrder.merchant_request_id
            });
        }
        
        // ============================================
        // PAYMENT ORDERS STATUS - NEW HANDLER
        // ============================================
        const paymentStatusMatch = pathname.match(/\/api\/attendee\/payment-orders\/(\d+)\/status\//);
        if (paymentStatusMatch) {
            const orderId = parseInt(paymentStatusMatch[1]);
            const order = mockPaymentOrders.find(o => o.id === orderId);
            if (order) {
                return createResponse({
                    success: true,
                    status: order.status,
                    data: order
                });
            }
            return createResponse({ success: false, message: 'Order not found' }, 404);
        }
        
        // ============================================
        // CART API
        // ============================================
        if (pathname === '/api/attendee/cart/') {
            if (method === 'GET') {
                return createResponse({ success: true, cart: mockCart });
            }
        }
        
        if (pathname === '/api/attendee/cart/add/') {
            const body = JSON.parse(options.body || '{}');
            const newItem = {
                id: body.event_id,
                title: body.title,
                price: body.price,
                quantity: body.quantity || 1,
                image: body.image
            };
            mockCart.items.push(newItem);
            mockCart.subtotal = mockCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            mockCart.total = mockCart.subtotal;
            saveCart();
            return createResponse({ success: true, message: 'Added to cart', cart: mockCart });
        }
        
        // ============================================
        // BOOKINGS API
        // ============================================
        if (pathname === '/api/attendee/bookings/') {
            return createResponse({
                success: true,
                bookings: mockBookings
            });
        }
        
        // ============================================
        // TICKETS API
        // ============================================
        if (pathname === '/api/attendee/tickets/upcoming/') {
            const upcoming = mockBookings.filter(b => new Date(b.event_date) > new Date());
            return createResponse({
                success: true,
                results: upcoming
            });
        }
        
        // ============================================
        // NOTIFICATIONS API
        // ============================================
        if (pathname === '/api/attendee/notifications/') {
            return createResponse({
                success: true,
                notifications: [],
                unread_count: 0
            });
        }
        
        // ============================================
        // SUPPORT TICKETS API
        // ============================================
        if (pathname === '/api/attendee/support/tickets/') {
            return createResponse({
                success: true,
                tickets: []
            });
        }
        
        // ============================================
        // REVIEWS API
        // ============================================
        if (pathname.match(/\/api\/attendee\/reviews\/create\/\d+\//)) {
            return createResponse({
                success: true,
                message: 'Review submitted successfully'
            });
        }
        
        // ============================================
        // FALLBACK: Pass through for unmocked endpoints
        // ============================================
        console.warn(`[Mock] No mock handler for ${method} ${pathname}, using real API`);
        return originalFetch(url, options);
    };
    
    console.log('%c[Mock API] Interceptor active - All API calls will return mock data', 'color: #10b981;');
})();