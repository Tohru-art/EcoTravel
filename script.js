/* =====================================================
   EcoTravel — Global Script
   ===================================================== */

/* ── Sticky Header & Scroll-Top Visibility ── */
const header       = document.querySelector('header');
const scrollTopBtn = document.getElementById('scroll-top');

window.addEventListener('scroll', () => {
    header.classList.toggle('sticky', window.scrollY > 60);
    if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});

/* ── Mobile Nav ── */
const menuIcon = document.querySelector('#menu-icon');
const navbar   = document.querySelector('.navbar');

menuIcon.addEventListener('click', () => {
    navbar.classList.toggle('open');
    menuIcon.classList.toggle('ri-menu-line');
    menuIcon.classList.toggle('ri-close-line');
});

navbar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('open');
        menuIcon.classList.add('ri-menu-line');
        menuIcon.classList.remove('ri-close-line');
    });
});

/* ── Scroll Reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Animated Counters ── */
function animateCounter(el) {
    const num    = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    if (num === 0) { el.textContent = '0' + suffix; return; }
    const duration = 1800;
    const start    = performance.now();
    const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(num * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

/* ── Scroll To Top ── */
if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () =>
        window.scrollTo({ top: 0, behavior: 'smooth' })
    );
}
