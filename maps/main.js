/* =====================================================
   EcoTravel — Eco Calculator
   Uses Nominatim geocoding (free, no API key) +
   Haversine distance + real CO₂ emissions data
   ===================================================== */

const TRANSPORT_MODES = [
    { id: 'walk',  label: 'Walking', icon: 'ri-walk-line',   co2PerKm: 0,   speedKmh: 5,  color: '#4ade80' },
    { id: 'cycle', label: 'Cycling', icon: 'ri-bike-line',   co2PerKm: 0,   speedKmh: 15, color: '#86efac' },
    { id: 'bus',   label: 'Bus',     icon: 'ri-bus-line',    co2PerKm: 89,  speedKmh: 30, color: '#fbbf24' },
    { id: 'car',   label: 'Car',     icon: 'ri-car-line',    co2PerKm: 171, speedKmh: 60, color: '#f87171' },
];

async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding service unavailable. Please try again.');
    const data = await res.json();
    if (data.length === 0) throw new Error(`Location not found: "${query}". Try adding a city or country.`);
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcResults(distanceKm) {
    return TRANSPORT_MODES.map(mode => ({
        ...mode,
        totalCo2g: Math.round(mode.co2PerKm * distanceKm),
        timeMin:   Math.round((distanceKm / mode.speedKmh) * 60),
    }));
}

function renderResults(distanceKm, results) {
    const maxCo2 = Math.max(...results.map(r => r.totalCo2g), 1);
    const best   = results.find(r => r.totalCo2g === 0) || results[0];
    const worst  = results[results.length - 1];

    document.getElementById('distance-value').textContent = distanceKm.toFixed(1);

    const grid = document.getElementById('transport-grid');
    grid.innerHTML = results.map(r => {
        const barPct  = r.totalCo2g === 0 ? 2 : Math.round((r.totalCo2g / maxCo2) * 100);
        const co2Text = r.totalCo2g === 0 ? '0 g CO\u2082' : `${r.totalCo2g.toLocaleString()} g CO\u2082`;
        return `
        <div class="transport-card">
            <div class="transport-header">
                <i class="${r.icon}" style="color:${r.color}"></i>
                <strong>${r.label}</strong>
                <span class="co2-badge" style="color:${r.color}">${co2Text}</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width:${barPct}%;background:${r.color}"></div>
            </div>
            <div class="transport-meta">
                <span>~${formatTime(r.timeMin)}</span>
                <span>${r.co2PerKm === 0 ? 'Zero emissions' : `${r.co2PerKm} g/km`}</span>
            </div>
        </div>`;
    }).join('');

    const savings = worst.totalCo2g - best.totalCo2g;
    document.getElementById('recommendation').innerHTML = `
        <i class="ri-leaf-fill"></i>
        <div>
            <strong>Best choice: ${best.label}</strong>
            <p>Saves up to ${savings.toLocaleString()} g of CO\u2082 compared to driving.</p>
        </div>`;

    document.getElementById('results').classList.remove('hidden');
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

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
    btn.innerHTML = '<i class="ri-loader-4-line"></i> Calculating...';

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

    } catch (err) {
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-leaf-line"></i> Calculate Emissions';
    }
});
