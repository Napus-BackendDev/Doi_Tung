document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('lang') || 'th';
    let translations = {};

    const langToggleBtn = document.getElementById('lang-toggle');

    // Load static translations
    async function fetchTranslations(lang) {
        try {
            const response = await fetch(`/lang/${lang}.json`);
            translations = await response.json();
            applyTranslations();
            updateLangBtnText(lang);
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    function updateLangBtnText(lang) {
        const btn = document.getElementById('lang-toggle');
        if (btn) {
            btn.innerText = lang === 'en' ? 'TH' : 'EN';
        }
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[key];
                } else {
                    el.innerText = translations[key];
                }
            }
        });
        document.documentElement.setAttribute('data-lang', currentLang);
    }

    let allProducts = []; // Cache for filtering

    async function loadProductDetail(lang) {
        const container = document.getElementById('product-detail-container');
        if (!container) return;

        const urlParams = new URLSearchParams(window.location.search);
        const productId = window.PRODUCT_ID || urlParams.get('id');

        if (!productId) {
            console.warn('No product ID found. Redirecting...');
            // Optional: window.location.href = 'products.html';
            return;
        }

        try {
            const response = await fetch('/data/products.json');
            const products = await response.json();
            const product = products.find(p => p.id === productId || p.slug === productId);

            if (!product) {
                container.innerHTML = `<h2 style="grid-column: 1/-1; text-align: center; padding: 50px;">Product not found</h2>`;
                return;
            }

            container.innerHTML = `
            <div class="product-detail-grid">
                <div class="detail-gallery reveal">
                    <div class="gallery-main">
                        <img src="${product.gallery ? product.gallery[0] : product.image || 'images/placeholder.png'}" id="main-img" alt="${product.name[lang]}">
                    </div>
                    ${product.gallery && product.gallery.length > 1 ? `
                        <div class="gallery-thumbnails">
                            ${product.gallery.map((img, i) => `
                                <div class="thumb ${i === 0 ? 'active' : ''}" onclick="updateGallery('${img}', this)">
                                    <img src="${img}" alt="Thumbnail ${i + 1}">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="detail-info reveal">
                    ${product.tagline && product.tagline[lang] ? `<div class="detail-badge">${product.tagline[lang]}</div>` : ''}
                    <h2>${product.name[lang]}</h2>
                    ${product.owner ? `<div class="owner-line">👤 ${product.owner}</div>` : ''}
                    <div class="detail-price">${product.price || 'Contact for price'}</div>
                    
                    <div class="detail-description-label" data-i18n="product_description">${translations.product_description || 'Brief Description'}</div>
                    <p class="detail-description">${product.description[lang]}</p>
                    
                    <div class="detail-actions">
                        ${product.contact ? `
                            <div class="detail-contact-box">
                                <p data-i18n="contact_label">${translations.contact_label || 'Interested in this product?'}</p>
                                <a href="tel:${product.contact}" class="contact-btn">
                                    <span>📞</span>
                                    <span data-i18n="call_now">${translations.call_now || 'Call Sales Representative'}</span>
                                    <span>: ${product.contact}</span>
                                </a>
                            </div>
                        ` : `
                            <button class="cta-button" data-i18n="add_to_cart">${translations.add_to_cart || 'Add to Cart'}</button>
                        `}
                    </div>
                </div>
            </div>

            ${product.story && product.story[lang] ? `
                <div class="detail-story-section reveal">
                    <div class="story-content">
                        <h3 data-i18n="story_label">${translations.story_label || 'The Story Behind'}</h3>
                        <p>${product.story[lang]}</p>
                    </div>
                </div>
            ` : ''}

            <div class="detail-extended-grid">
                ${product.about && product.about[lang] ? `
                    <div class="detail-about-box reveal">
                        <h3 data-i18n="about_product">${translations.about_product || 'About the Product'}</h3>
                        <p>${product.about[lang]}</p>
                    </div>
                ` : ''}

                ${product.highlights && product.highlights[lang] && product.highlights[lang].length > 0 ? `
                    <div class="detail-highlights-box reveal">
                        <h3 data-i18n="highlights_label">${translations.highlights_label || 'Highlights'}</h3>
                        <ul class="detail-highlights-list">
                            ${product.highlights[lang].map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>

            ${product.royal && product.royal[lang] ? `
                <div class="royal-project-box reveal">
                    <h3>👑 Kad Doi Tung - Mae Fah Luang Foundation</h3>
                    <p>${product.royal[lang]}</p>
                </div>
            ` : ''}
        `;

        // Add gallery function to global scope
        window.updateGallery = (imgSrc, thumbEl) => {
            document.getElementById('main-img').src = imgSrc;
            document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
            thumbEl.classList.add('active');
        };
        setupScrollReveal();
    } catch (error) {
            console.error('Error loading product detail:', error);
        }
    }

    async function init() {
        const savedLang = localStorage.getItem('lang') || 'th';
        await fetchTranslations(savedLang);

        const productGrid = document.getElementById('product-grid');
        const featuredGrid = document.getElementById('featured-grid');
        const detailContainer = document.getElementById('product-detail-container');

        if (productGrid) {
            fetchAndRenderProducts(savedLang, 'product-grid');
        }

        if (featuredGrid) {
            fetchAndRenderProducts(savedLang, 'featured-grid', 3);
        }

        if (detailContainer) {
            loadProductDetail(savedLang);
        }

        const farmerGrid = document.getElementById('farmer-grid');
        if (farmerGrid) {
            await renderFarmerDirectory(savedLang);
        }

        setupScrollReveal();
    }

    async function fetchAndRenderProducts(lang, containerId, limit = null, factoryFilter = 'all') {
        try {
            if (allProducts.length === 0) {
                const response = await fetch('/data/products.json');
                allProducts = await response.json();
            }

            let products = [...allProducts];

            // Setup sidebar if on products page
            const filterList = document.getElementById('factory-filters');
            if (filterList && filterList.children.length <= 1) {
                setupSidebarFilters(products, lang);
            }

            if (factoryFilter !== 'all') {
                products = products.filter(p => p.factory_id === factoryFilter);
            }

            if (limit) {
                products = products.slice(0, limit);
            }

            const container = document.getElementById(containerId);
            if (!container) return;

            if (products.length === 0) {
                container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-light);">No products found here.</p>`;
                return;
            }

            container.innerHTML = products.map(product => `
                <a href="/product-detail?id=${product.slug || product.id}" class="product-card reveal">
                    <div class="product-img" style="background-image: url('${product.image || '/images/placeholder.png'}')"></div>
                    <div class="product-info">
                        <h3>${product.name[lang]}</h3>
                        <p>${product.description[lang]}</p>
                        <div class="product-price">฿${product.price}</div>
                    </div>
                </a>
            `).join('');

            setupScrollReveal();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    function setupSidebarFilters(products, lang) {
        const filterList = document.getElementById('factory-filters');
        if (!filterList) return;

        const factories = [...new Set(products.map(p => p.factory_id))];

        // Remove existing dynamic filters (keep the first 'All' item)
        while (filterList.children.length > 1) {
            filterList.removeChild(filterList.lastChild);
        }

        factories.forEach(factoryId => {
            const li = document.createElement('li');
            li.className = 'filter-item';
            li.setAttribute('data-factory', factoryId);

            // Fix: ensure the key is correctly prefixed
            const i18nKey = factoryId.startsWith('factory_') ? factoryId : `factory_${factoryId}`;
            li.setAttribute('data-i18n', i18nKey);
            li.innerText = translations[i18nKey] || factoryId;

            li.addEventListener('click', () => {
                document.querySelectorAll('.filter-item').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
                fetchAndRenderProducts(currentLang, 'product-grid', null, factoryId);
            });

            filterList.appendChild(li);
        });

        const allItem = filterList.querySelector('[data-factory="all"]');
        if (allItem) {
            allItem.onclick = () => {
                document.querySelectorAll('.filter-item').forEach(item => item.classList.remove('active'));
                allItem.classList.add('active');
                fetchAndRenderProducts(currentLang, 'product-grid', null, 'all');
            };
        }
    }

    // Language Toggle Listener
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', async () => {
            currentLang = currentLang === 'en' ? 'th' : 'en';
            localStorage.setItem('lang', currentLang);
            await fetchTranslations(currentLang);

            const productGrid = document.getElementById('product-grid');
            const featuredGrid = document.getElementById('featured-grid');
            const detailContainer = document.getElementById('product-detail-container');

            if (productGrid) {
                const activeFilter = document.querySelector('.filter-item.active')?.getAttribute('data-factory') || 'all';
                fetchAndRenderProducts(currentLang, 'product-grid', null, activeFilter);
                setupSidebarFilters(allProducts, currentLang); // Refresh sidebar text
            }
            if (featuredGrid) fetchAndRenderProducts(currentLang, 'featured-grid', 3);
            if (detailContainer) loadProductDetail(currentLang);
        });
    }

    // Reveal on scroll
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    function setupScrollReveal() {
        document.querySelectorAll('.reveal').forEach(el => {
            revealObserver.observe(el);
        });
    }

    // Form Handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const status = document.getElementById('form-status');
        const submitBtn = document.getElementById('submit-btn');

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // UI state: Loading
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = currentLang === 'th' ? 'กำลังส่ง...' : 'Sending...';
            submitBtn.disabled = true;
            status.innerText = '';
            status.className = 'form-status';

            try {
                const data = new FormData(contactForm);
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: data,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    status.innerText = currentLang === 'th'
                        ? 'ขอบคุณ! ข้อความของคุณถูกส่งเรียบร้อยแล้ว'
                        : 'Thanks! Your message has been sent successfully.';
                    status.classList.add('success');
                    contactForm.reset();
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (error) {
                status.innerText = currentLang === 'th'
                    ? 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
                    : 'Oops! There was a problem. Please try again.';
                status.classList.add('error');
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Initial Load
    // --- Farmer Directory ---
    async function renderFarmerDirectory(lang) {
        const container = document.getElementById('farmer-grid');
        if (!container) return;

        try {
            const response = await fetch('/data/products.json');
            const products = await response.json();

            // Unique producers by owner name
            const producers = [];
            const seenOwners = new Set();

            products.forEach(p => {
                if (p.owner && !seenOwners.has(p.owner)) {
                    producers.push({
                        owner: p.owner,
                        contact: p.contact,
                        productName: p.name[lang],
                        image: p.image
                    });
                    seenOwners.add(p.owner);
                }
            });

            container.innerHTML = producers.map(producer => {
                // Split owner line to get the short name (before parenthesis)
                const shortName = producer.owner.split('(')[0].trim();
                return `
                    <div class="farmer-card">
                        <div class="farmer-img" style="background-image: url('${producer.image}')"></div>
                        <div class="farmer-info">
                            <h3>${shortName}</h3>
                            <p class="farmer-owner">${producer.owner}</p>
                            <p class="farmer-specialty">Specializing in: ${producer.productName}</p>
                            <a href="tel:${producer.contact}" class="farmer-contact-btn">📞 ${producer.contact}</a>
                        </div>
                    </div>
                `;
            }).join('');

            setupScrollReveal();
        } catch (error) {
            console.error('Error loading farmer directory:', error);
        }
    }

    init();
});
