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

    let allProducts = [];

    async function getProducts() {
        if (allProducts.length > 0) return allProducts;
        try {
            const response = await fetch('/data/products.json');
            allProducts = await response.json();
            return allProducts;
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    async function loadProductDetail(lang) {
        const container = document.getElementById('product-detail-container');
        if (!container) return;

        const urlParams = new URLSearchParams(window.location.search);

        // Safety Net Order: 1. URL Parameter, 2. Session Backup, 3. Path Fallback
        let productId = window.PRODUCT_ID || urlParams.get('id') || sessionStorage.getItem('lastProductId');

        // Fallback: Path-based ID (e.g. /product-detail/wellness)
        if (!productId) {
            const pathParts = window.location.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart !== 'product-detail' && lastPart !== 'product-detail.html') {
                productId = lastPart;
            }
        }

        if (!productId) {
            console.error('CRITICAL: No product ID found in URL. Use product-detail.html?id=slug');
            container.innerHTML = `<div style="text-align:center; padding:100px;">
                <h2>Please select a product.</h2>
                <br><a href="products.html" class="cta-button">Back to Products</a>
            </div>`;
            return;
        }

        try {
            const products = await getProducts();
            if (!products || products.length === 0) {
                throw new Error("No products loaded");
            }

            const product = products.find(p => p.id === productId || p.slug === productId);

            if (!product) {
                container.innerHTML = `<div style="text-align:center; padding:100px;">
                    <h2 data-i18n="not_found">Product not found</h2>
                    <br><a href="products.html" class="cta-button">Back to All Products</a>
                </div>`;
                return;
            }

            // Defensive defaults
            const pName = (product.name && product.name[lang]) || (product.name && product.name['th']) || 'Product';
            const pDesc = (product.description && product.description[lang]) || '';
            const pPrice = product.price || '';
            const pOwner = product.owner || '';

            container.innerHTML = `
            <div class="product-detail-grid">
                <div class="detail-gallery reveal">
                    <div class="gallery-main">
                        <img src="${product.gallery ? product.gallery[0] : product.image || 'images/placeholder.png'}" 
                             id="main-img" 
                             class="fade-in loaded"
                             alt="${pName}">
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
                    <h2>${pName}</h2>
                    ${pOwner ? `<div class="owner-line">👤 ${pOwner}</div>` : ''}
                    ${pPrice && (pPrice.toString().includes('ติดต่อสอบถาม') || pPrice.toString().includes('B2B') || pPrice.toString().includes('Wholesale') || pPrice.toString().includes('ราคาส่ง'))
                    ? `<button class="detail-view-btn" data-i18n="view_detail">${translations.view_detail || 'View Detail'}</button>`
                    : `<div class="detail-price">${(pPrice.toString().startsWith('฿') || isNaN(pPrice)) ? pPrice : '฿' + pPrice}</div>`
                }

                    <div class="detail-description-label" data-i18n="product_description">${translations.product_description || 'Brief Description'}</div>
                    <p class="detail-description">${pDesc}</p>
                    
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

                ${product.highlights && product.highlights[lang] && Array.isArray(product.highlights[lang]) ? `
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

            window.updateGallery = (imgSrc, thumbEl) => {
                document.getElementById('main-img').src = imgSrc;
                document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                thumbEl.classList.add('active');
            };
            setupScrollReveal();
            applyTranslations();
        } catch (error) {
            console.error('Error loading product detail:', error);
            container.innerHTML = '<div style="text-align:center; padding:50px;"><h2>Error loading product details. Please try again.</h2></div>';
        }
    }

    async function init() {
        const savedLang = localStorage.getItem('lang') || 'th';

        // Ensure translations are ready first
        await fetchTranslations(savedLang);

        const productGrid = document.getElementById('product-grid');
        const featuredGrid = document.getElementById('featured-grid');
        const detailContainer = document.getElementById('product-detail-container');
        const farmerGrid = document.getElementById('farmer-grid');

        // Render all page sections in parallel for speed
        const loaders = [];

        if (productGrid) {
            loaders.push(fetchAndRenderProducts(savedLang, 'product-grid'));
        }
        if (featuredGrid) {
            loaders.push(fetchAndRenderProducts(savedLang, 'featured-grid', 3));
        }
        if (detailContainer) {
            loaders.push(loadProductDetail(savedLang));
        }
        if (farmerGrid) {
            loaders.push(renderFarmerDirectory(savedLang));
        }

        // Wait for ALL content to be injected before finishing
        await Promise.all(loaders);

        // Finalize reveal effects once everything is in the DOM
        setupScrollReveal();
    }

    async function fetchAndRenderProducts(lang, containerId, limit = null, factoryFilter = 'all') {
        try {
            const productsData = await getProducts();
            let products = [...productsData];

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

            container.innerHTML = products.map(product => {
                const pid = product.slug || product.id;
                return `
                <a href="product-detail?id=${pid}" 
                   onclick="sessionStorage.setItem('lastProductId', '${pid}')"
                   class="product-card reveal">
                    <div class="product-img" style="background-image: url('${product.image || 'images/placeholder.png'}')"></div>
                    <div class="product-info">
                        <h3>${product.name[lang]}</h3>
                        <p>${product.description[lang]}</p>
                        <div class="product-price">
                            ${product.price && (product.price.toString().includes('ติดต่อสอบถาม') || product.price.toString().includes('B2B') || product.price.toString().includes('Wholesale') || product.price.toString().includes('ราคาส่ง'))
                        ? `<span class="detail-view-btn" data-i18n="view_detail">${translations.view_detail || 'View Detail'}</span>`
                        : `฿${product.price}`
                    }
                        </div>
                    </div>
                </a>
            `}).join('');

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

    // Hamburger Menu Toggle
    const hamburgerBtn = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Filter Dropdown Toggle (Mobile/Tablet)
    const filterToggle = document.getElementById('filter-toggle');
    const filterList = document.getElementById('factory-filters');

    if (filterToggle && filterList) {
        filterToggle.addEventListener('click', () => {
            filterToggle.classList.toggle('active');
            filterList.classList.toggle('active');
        });

        // Close dropdown when a filter item is clicked
        filterList.querySelectorAll('.filter-item').forEach(item => {
            item.addEventListener('click', () => {
                // Update button text to show selected filter
                const selectedText = item.textContent.trim();
                filterToggle.textContent = selectedText + ' ▼';

                filterToggle.classList.remove('active');
                filterList.classList.remove('active');
            });
        });
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
            if (document.getElementById('farmer-grid')) renderFarmerDirectory(currentLang);
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
            const products = await getProducts();
            if (!products || products.length === 0) {
                console.warn('No products found for farmer directory.');
                return;
            }

            // Unique producers by owner name
            const producers = [];
            const seenOwners = new Set();

            products.forEach(p => {
                // Defensive: handle both string owner and object owner
                let ownerName = '';
                if (typeof p.owner === 'string') {
                    ownerName = p.owner;
                } else if (p.owner && typeof p.owner === 'object') {
                    ownerName = p.owner[lang] || p.owner['th'] || '';
                }

                if (ownerName && !seenOwners.has(ownerName)) {
                    producers.push({
                        owner: ownerName,
                        contact: p.contact || '',
                        productName: (p.name && p.name[lang]) || (p.name && p.name['th']) || '',
                        image: p.image || 'images/placeholder.png'
                    });
                    seenOwners.add(ownerName);
                }
            });

            if (producers.length === 0) {
                container.innerHTML = `<p style="text-align:center; padding:50px; color:var(--text-light);">No producer information available at this time.</p>`;
                return;
            }

            container.innerHTML = producers.map(producer => {
                // Fix: product.owner is a string, not an object
                const ownerStr = producer.owner;
                // Split owner line to get the short name (before parenthesis)
                const shortName = ownerStr.split('(')[0].trim();
                return `
                    <div class="farmer-card reveal">
                        <div class="farmer-img-container">
                             <img src="${producer.image}" 
                                  class="fade-in loaded" 
                                  alt="${ownerStr}">
                        </div>
                        <div class="farmer-info">
                            <h3>${shortName}</h3>
                            <p class="farmer-owner">${ownerStr}</p>
                            <p class="farmer-specialty">${translations.specializing_in || 'Specializing in:'} ${producer.productName}</p>
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
