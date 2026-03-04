/* =====================================================
   EcoTravel — Eco Calculator  (maps/main.js)
   Nominatim geocoding · Haversine distance · Leaflet map
   ===================================================== */

const TRANSPORT_MODES = [
    { id: 'walk',  label: 'Walking', icon: 'ri-walk-line',   co2PerKm: 0,   speedKmh: 5,  color: '#4ade80', maxKm: 2.5  },
    { id: 'cycle', label: 'Cycling', icon: 'ri-bike-line',   co2PerKm: 0,   speedKmh: 15, color: '#86efac', maxKm: 12   },
    { id: 'train', label: 'Train',   icon: 'ri-train-line',  co2PerKm: 41,  speedKmh: 80, color: '#60a5fa', maxKm: Infinity },
    { id: 'bus',   label: 'Bus',     icon: 'ri-bus-line',    co2PerKm: 89,  speedKmh: 30, color: '#fbbf24', maxKm: Infinity },
    { id: 'car',   label: 'Car',     icon: 'ri-car-line',    co2PerKm: 171, speedKmh: 60, color: '#f87171', maxKm: Infinity },
];

/* ── Geocoding ── */
async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Geocoding service unavailable. Please try again.');
    const data = await res.json();
    if (data.length === 0) throw new Error(`Location not found: "${query}". Try adding a city or country.`);
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

/* ── Distance ── */
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Helpers ── */
function formatTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcResults(distanceKm) {
    return TRANSPORT_MODES.map(mode => ({
        ...mode,
        totalCo2g:   Math.round(mode.co2PerKm * distanceKm),
        timeMin:     Math.round((distanceKm / mode.speedKmh) * 60),
        isPractical: distanceKm <= mode.maxKm,
    }));
}

/* Pick the best realistic mode — ignores modes that are impractical for the distance */
function getBestChoice(results) {
    const practical = results.filter(r => r.isPractical);
    if (practical.length === 0) return results[results.length - 1]; // fallback: car

    // Among practical modes, prefer zero-emission; if multiple, take the fastest
    const zeroEmission = practical.filter(r => r.totalCo2g === 0);
    if (zeroEmission.length > 0) {
        return zeroEmission.reduce((a, b) => a.speedKmh > b.speedKmh ? a : b);
    }

    return practical.reduce((a, b) => a.totalCo2g < b.totalCo2g ? a : b);
}

/* ── Leaflet Map ── */
let ecoMap     = null;
let routeLayer = null;

function initMap(lat1, lon1, lat2, lon2) {
    if (!ecoMap) {
        ecoMap = L.map('route-map', { zoomControl: true, attributionControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(ecoMap);
    }

    if (routeLayer) routeLayer.clearLayers();
    routeLayer = L.layerGroup().addTo(ecoMap);

    const makeIcon = (cls) => L.divIcon({
        className: '',
        html: `<div class="${cls}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });

    L.marker([lat1, lon1], { icon: makeIcon('eco-dot eco-dot--start') }).addTo(routeLayer);
    L.marker([lat2, lon2], { icon: makeIcon('eco-dot eco-dot--end') }).addTo(routeLayer);
    L.polyline([[lat1, lon1], [lat2, lon2]], {
        color: '#59ff43', weight: 2, dashArray: '8 6', opacity: 0.8,
    }).addTo(routeLayer);

    ecoMap.fitBounds(L.latLngBounds([[lat1, lon1], [lat2, lon2]]).pad(0.3));
    setTimeout(() => ecoMap && ecoMap.invalidateSize(), 300);
}

/* ── Render Results ── */
function renderResults(distanceKm, results) {
    const maxCo2 = Math.max(...results.map(r => r.totalCo2g), 1);
    const best   = getBestChoice(results);
    const car    = results.find(r => r.id === 'car');

    document.getElementById('distance-value').textContent = distanceKm.toFixed(1);

    /* Transport cards */
    const grid = document.getElementById('transport-grid');
    grid.innerHTML = results.map(r => {
        const barPct      = r.totalCo2g === 0 ? 2 : Math.round((r.totalCo2g / maxCo2) * 100);
        const co2Text     = r.totalCo2g === 0 ? '0 g CO\u2082' : `${r.totalCo2g.toLocaleString()} g CO\u2082`;
        const dimStyle    = r.isPractical ? '' : 'opacity:0.45;';
        const impractical = r.isPractical ? '' : `<span class="impractical-tag">Not practical</span>`;
        return `
        <div class="transport-card" style="${dimStyle}">
            <div class="transport-header">
                <i class="${r.icon}" style="color:${r.color}"></i>
                <strong>${r.label}</strong>
                ${impractical}
                <span class="co2-badge" style="color:${r.color}">${co2Text}</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width:0%;background:${r.color}" data-pct="${barPct}"></div>
            </div>
            <div class="transport-meta">
                <span>~${formatTime(r.timeMin)}</span>
                <span>${r.co2PerKm === 0 ? 'Zero emissions' : `${r.co2PerKm} g/km`}</span>
            </div>
        </div>`;
    }).join('');

    /* Animate progress bars (double rAF so 0% is painted first) */
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.querySelectorAll('.progress-fill[data-pct]').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        });
    });

    /* Recommendation — smart copy based on distance + savings */
    {
        const timeDiff   = car ? best.timeMin - car.timeMin : 0;
        const pctSavings = car && car.totalCo2g > 0
            ? Math.round((1 - best.totalCo2g / car.totalCo2g) * 100)
            : 100;

        const timeNote = timeDiff <= 0
            ? `<b style="color:var(--accent)">${Math.abs(timeDiff)} min faster</b> than driving`
            : `only <b style="color:var(--text-primary)">${timeDiff} min more</b> than driving`;

        const ecoNote = best.totalCo2g === 0
            ? `<b style="color:var(--accent)">zero direct emissions</b>`
            : `<b style="color:var(--accent)">${pctSavings}% fewer emissions</b> than driving`;

        document.getElementById('recommendation').innerHTML = `
            <i class="ri-leaf-fill"></i>
            <div>
                <strong>Best realistic choice: ${best.label}</strong>
                <p>${ecoNote} — ${timeNote}.</p>
            </div>`;
    }

    /* Annual commute projection */
    if (car) {
        const tripsPerYear = 260 * 2;                                          // 5-day week, round trip
        const carAnnualKg  = Math.round((car.totalCo2g * tripsPerYear) / 1000);
        const bestAnnualKg = Math.round((best.totalCo2g * tripsPerYear) / 1000);
        const savingsKg    = carAnnualKg - bestAnnualKg;
        const trees        = Math.max(1, Math.round(savingsKg / 21));           // avg tree absorbs ~21 kg/yr

        document.getElementById('annual-impact').innerHTML = `
            <div class="annual-title"><i class="ri-calendar-line"></i> Annual Commute Projection</div>
            <strong>${carAnnualKg.toLocaleString()} kg CO\u2082</strong>
            if you drive this route 5 days/week for a year
            <br><br>
            Switching to <b style="color:var(--text-primary)">${best.label}</b> saves
            <b style="color:var(--accent)">${savingsKg.toLocaleString()} kg CO\u2082/year</b> —
            equivalent to planting <b style="color:var(--accent)">${trees.toLocaleString()}</b> tree${trees !== 1 ? 's' : ''}.`;
    }

    document.getElementById('results').classList.remove('hidden');
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Form Submit ── */
document.getElementById('calc-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const startVal = document.getElementById('start').value.trim();
    const destVal  = document.getElementById('destination').value.trim();
    const errorEl  = document.getElementById('calc-error');
    const btn      = document.getElementById('calc-btn');

    errorEl.textContent = '';
    document.getElementById('results').classList.add('hidden');

    if (!startVal || !destVal) {
        errorEl.textContent = 'Please enter both a start and destination location.';
        return;
    }
    if (startVal.toLowerCase() === destVal.toLowerCase()) {
        errorEl.textContent = 'Start and destination appear to be the same. Please enter two different locations.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Calculating\u2026';

    try {
        const [startCoords, destCoords] = await Promise.all([
            geocode(startVal),
            geocode(destVal),
        ]);

        const distKm = haversineKm(
            startCoords.lat, startCoords.lon,
            destCoords.lat,  destCoords.lon
        );

        if (distKm < 0.05) {
            errorEl.textContent = 'These locations appear to be at the same point. Try more specific addresses.';
            return;
        }
        if (distKm > 15000) {
            errorEl.textContent = `Distance of ${Math.round(distKm).toLocaleString()} km seems unexpectedly large. Try adding a city or country.`;
            return;
        }

        renderResults(distKm, calcResults(distKm));

        /* Show map after results are visible */
        setTimeout(() => initMap(startCoords.lat, startCoords.lon, destCoords.lat, destCoords.lon), 80);

    } catch (err) {
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-leaf-line"></i> Calculate Emissions';
    }
});
