// ============================================
// TERMS OF SERVICE PAGE - Interactive Elements
// FIXED: PDF download functionality
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Download Terms as PDF
    const downloadBtn = document.getElementById('downloadTerms');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function() {
            // Show loading state
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            downloadBtn.disabled = true;
            
            try {
                // Get the terms content element
                const termsContent = document.querySelector('.terms-content');
                
                if (termsContent) {
                    // Method 1: Use html2pdf library (if available)
                    if (typeof html2pdf !== 'undefined') {
                        const opt = {
                            margin: [0.5, 0.5, 0.5, 0.5],
                            filename: 'eventhub-terms-of-service.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, letterRendering: true, useCORS: true },
                            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                        };
                        await html2pdf().set(opt).from(termsContent).save();
                        showToast('PDF downloaded successfully!', 'success');
                    } 
                    // Method 2: Use browser print to PDF (fallback)
                    else {
                        // Create a new window for printing
                        const printWindow = window.open('', '_blank');
                        const title = document.title;
                        const styles = document.querySelectorAll('link[rel="stylesheet"]');
                        let stylesHTML = '';
                        
                        styles.forEach(style => {
                            if (style.href) {
                                stylesHTML += `<link rel="stylesheet" href="${style.href}">`;
                            }
                        });
                        
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>${title}</title>
                                ${stylesHTML}
                                <style>
                                    body {
                                        padding: 20px;
                                        font-family: 'Manrope', 'Inter', sans-serif;
                                    }
                                    .btn-download, .toast-notification, .terms-nav, .copy-btn {
                                        display: none !important;
                                    }
                                    .terms-content {
                                        margin: 0;
                                        padding: 0;
                                        border: none;
                                    }
                                    .terms-content::before,
                                    .terms-content::after {
                                        display: none !important;
                                    }
                                    @media print {
                                        body {
                                            margin: 0;
                                            padding: 0;
                                        }
                                        .terms-section {
                                            page-break-inside: avoid;
                                        }
                                    }
                                </style>
                            </head>
                            <body>
                                ${termsContent.outerHTML}
                            </body>
                            </html>
                        `);
                        
                        printWindow.document.close();
                        printWindow.print();
                        printWindow.onafterprint = function() {
                            printWindow.close();
                        };
                        
                        showToast('Print window opened. Use "Save as PDF" to download.', 'info');
                    }
                } else {
                    showToast('Could not find terms content to download.', 'error');
                }
            } catch (error) {
                console.error('PDF generation error:', error);
                showToast('Error generating PDF. Please try again.', 'error');
            } finally {
                // Reset button
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
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
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    if (type === 'error') {
        toast.style.borderLeftColor = '#ef4444';
    } else if (type === 'info') {
        toast.style.borderLeftColor = '#3b82f6';
    }
    
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

// Make functions global for debugging
window.showToast = showToast;