async function geocodeAddress(address) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'TH');
    url.searchParams.set('accept-language', 'th,en');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FacilityRequest/1.0 (bobbypunnawich@gmail.com)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    return { latitude: null, longitude: null };
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return { latitude: null, longitude: null };
  }
}

module.exports = { geocodeAddress };
