/**
 * India Post Pincode API helper
 * API: https://api.postalpincode.in/pincode/{pincode}
 * Free, no auth required
 */

const cache = {};

export async function fetchAreasByPincode(pincode) {
  if (!pincode || pincode.length !== 6) return [];

  // Return cached result if available
  if (cache[pincode]) return cache[pincode];

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();

    if (!Array.isArray(data) || data[0]?.Status !== 'Success') {
      return [];
    }

    const postOffices = data[0]?.PostOffice || [];
    const areas = postOffices.map(po => ({
      name: po.Name,
      district: po.District,
      state: po.State,
      display: po.Name,
    }));

    // Remove duplicates by name
    const unique = Array.from(new Map(areas.map(a => [a.name, a])).values());
    cache[pincode] = unique;
    return unique;
  } catch (err) {
    console.warn('[Pincode API] Error:', err);
    return [];
  }
}

export async function getStateByPincode(pincode) {
  const areas = await fetchAreasByPincode(pincode);
  return areas[0]?.state || '';
}

export async function getDistrictByPincode(pincode) {
  const areas = await fetchAreasByPincode(pincode);
  return areas[0]?.district || '';
}
