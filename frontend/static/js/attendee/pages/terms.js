// ============================================
// TERMS OF SERVICE PAGE - Interactive Elements
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Download Terms as PDF
    const downloadBtn = document.getElementById('downloadTerms');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            // Show loading state
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            downloadBtn.disabled = true;
            
            // Simulate PDF generation (replace with actual PDF generation)
            setTimeout(() => {
                // In a real implementation, you would generate or fetch the PDF
                // For now, we'll show a toast message
                showToast('PDF download will be available soon. Please check back later.', 'info');
                
                // Reset button
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
                
                // You can also trigger actual PDF download using jsPDF or similar library
                // generatePDF();
            }, 1500);
        });
    }
    
    // Add scroll spy for navigation (if you add navigation menu)
    const sections = document.querySelectorAll('.terms-section');
    const navLinks = document.querySelectorAll('.terms-nav a');
    
    function updateActiveNav() {
        if (navLinks.length === 0) return;
        
        let current = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Track scroll for active nav
    if (navLinks.length > 0) {
        window.addEventListener('scroll', updateActiveNav);
        updateActiveNav();
    }
    
    // Add copy to clipboard functionality for code blocks (if any)
    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.style.cssText = `
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: rgba(245, 158, 11, 0.2);
            border: none;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            cursor: pointer;
            color: #f59e0b;
            transition: all 0.2s ease;
        `;
        
        copyBtn.addEventListener('click', () => {
            const text = block.innerText;
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
                showToast('Copied to clipboard!', 'success');
            });
        });
        
        block.style.position = 'relative';
        block.appendChild(copyBtn);
    });
    
    // Add print functionality
    const printBtn = document.createElement('button');
    printBtn.className = 'btn-print';
    printBtn.innerHTML = '<i class="fas fa-print"></i> Print Terms';
    printBtn.style.cssText = `
        background: transparent;
        border: 1px solid #e2e8f0;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        margin-left: 1rem;
        transition: all 0.2s ease;
    `;
    
    printBtn.addEventListener('mouseenter', () => {
        printBtn.style.borderColor = '#f59e0b';
        printBtn.style.color = '#f59e0b';
    });
    
    printBtn.addEventListener('mouseleave', () => {
        printBtn.style.borderColor = '#e2e8f0';
        printBtn.style.color = '#64748b';
    });
    
    printBtn.addEventListener('click', () => {
        window.print();
    });
    
    // Add print button next to download button if exists
    if (downloadBtn && downloadBtn.parentElement) {
        const container = downloadBtn.parentElement;
        container.style.display = 'flex';
        container.style.gap = '1rem';
        container.style.justifyContent = 'center';
        container.style.flexWrap = 'wrap';
        
        // Uncomment to add print button
        // container.appendChild(printBtn);
    }
    
    // Add last modified date
    const lastModified = document.lastModified;
    const lastModifiedSpan = document.createElement('span');
    lastModifiedSpan.style.cssText = `
        display: block;
        text-align: center;
        font-size: 0.7rem;
        color: #94a3b8;
        margin-top: 1rem;
    `;
    
    const date = new Date(lastModified);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    lastModifiedSpan.innerHTML = `<i class="fas fa-edit"></i> Page last modified: ${formattedDate}`;
    
    const container = document.querySelector('.container');
    if (container) {
        container.appendChild(lastModifiedSpan);
    }
});

// Toast notification function
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// PDF generation function (placeholder - can be implemented with jsPDF)
function generatePDF() {
    // This function would use a library like jsPDF or html2pdf
    // Example using html2pdf (needs to be installed)
    /*
    const element = document.querySelector('.terms-content');
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: 'eventhub-terms-of-service.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
    */
    
    // For now, show message
    showToast('PDF generation feature coming soon!', 'info');
}

// Make functions global for debugging
window.showToast = showToast;
window.generatePDF = generatePDF;