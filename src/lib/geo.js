/**
 * Geo & Pincode coordinate resolution for India
 * Resolves pincodes or device location to latitude/longitude
 */

export const PINCODE_REGION_COORDINATES = {
  // Northern Region
  '11': [28.6139, 77.2090], // Delhi
  '12': [28.4595, 77.0266], // Gurgaon / Faridabad / Haryana
  '13': [30.1333, 77.2833], // Ambala / North Haryana
  '14': [30.9010, 75.8573], // Ludhiana / Punjab
  '15': [30.2110, 74.9455], // Bathinda / SW Punjab
  '16': [30.7333, 76.7794], // Chandigarh
  '17': [31.1048, 77.1734], // Shimla / Himachal Pradesh
  '18': [32.7266, 74.8570], // Jammu
  '19': [34.0837, 74.7973], // Srinagar / Kashmir
  '20': [28.5355, 77.3910], // Noida / Ghaziabad / W-UP
  '21': [25.4358, 81.8463], // Prayagraj / Allahabad
  '22': [26.8467, 80.9462], // Lucknow / Central-UP
  '23': [25.3176, 82.9739], // Varanasi
  '24': [30.3165, 78.0322], // Dehradun / Uttarakhand
  '25': [28.9845, 77.7064], // Meerut
  '26': [29.2183, 79.5130], // Haldwani / Kumaon
  '27': [26.7606, 83.3732], // Gorakhpur
  '28': [27.1767, 78.0081], // Agra / Jhansi

  // Western & Central Region
  '30': [26.9124, 75.7873], // Jaipur
  '31': [24.5854, 73.7125], // Udaipur
  '32': [25.2138, 75.8648], // Kota
  '33': [28.0229, 73.3119], // Bikaner
  '34': [26.2389, 73.0243], // Jodhpur
  '36': [22.3039, 70.8022], // Rajkot
  '37': [23.2420, 69.6669], // Bhuj / Kutch
  '38': [23.0225, 72.5714], // Ahmedabad / Gandhinagar
  '39': [21.1702, 72.8311], // Surat / Vadodara
  '40': [18.9220, 72.8347], // Mumbai
  '41': [18.5204, 73.8567], // Pune
  '42': [19.9975, 73.7898], // Nashik
  '43': [19.8762, 75.3433], // Chhatrapati Sambhajinagar
  '44': [21.1458, 79.0882], // Nagpur
  '45': [22.7196, 75.8577], // Indore
  '46': [23.2599, 77.4126], // Bhopal
  '47': [26.2183, 78.1828], // Gwalior
  '48': [23.1815, 79.9864], // Jabalpur
  '49': [21.2514, 81.6296], // Raipur / Chhattisgarh

  // Southern Region
  '50': [17.3850, 78.4867], // Hyderabad / Telangana
  '51': [14.4673, 78.8242], // Kadapa / Tirupati
  '52': [16.5062, 80.6480], // Vijayawada / Guntur
  '53': [17.6868, 83.2185], // Visakhapatnam
  '56': [12.9716, 77.5946], // Bengaluru
  '57': [12.9141, 74.8560], // Mangalore
  '58': [15.3647, 75.1240], // Hubli / Dharwad
  '59': [15.8497, 74.4977], // Belagavi
  '60': [13.0827, 80.2707], // Chennai
  '61': [10.7905, 78.7047], // Tiruchirappalli
  '62': [9.9252, 78.1198], // Madurai
  '63': [12.9165, 79.1325], // Vellore / Salem
  '64': [11.0168, 76.9558], // Coimbatore
  '67': [11.2588, 75.7804], // Kozhikode / Malappuram
  '68': [9.9312, 76.2673], // Kochi / Ernakulam
  '69': [8.5241, 76.9366], // Thiruvananthapuram

  // Eastern & North-Eastern Region
  '70': [22.5726, 88.3639], // Kolkata
  '71': [23.2324, 87.8615], // Bardhaman / Durgapur
  '72': [22.4257, 87.3199], // Medinipur
  '73': [26.7271, 88.3953], // Siliguri / Darjeeling
  '74': [22.7562, 88.3639], // North 24 Parganas
  '75': [20.2961, 85.8245], // Bhubaneswar
  '76': [19.3149, 84.7941], // Berhampur
  '77': [21.4669, 83.9812], // Sambalpur / Rourkela
  '78': [26.1445, 91.7362], // Guwahati / Assam
  '79': [25.5788, 91.8933], // Shillong / Meghalaya / NE
  '80': [25.5941, 85.1376], // Patna
  '81': [25.2425, 86.9842], // Bhagalpur
  '82': [24.7914, 85.0002], // Gaya
  '83': [23.3441, 85.3096], // Ranchi
  '84': [26.1209, 85.3647], // Muzaffarpur
  '85': [25.7796, 87.4753], // Purnia
};

const geoCache = {};

/**
 * Get coordinates [lat, lng] for an Indian pincode
 */
export async function getCoordinatesForPincode(pincode) {
  if (!pincode) return [28.6139, 77.2090]; // Default to New Delhi (national capital)
  const cleanPin = String(pincode).trim();

  if (geoCache[cleanPin]) {
    return geoCache[cleanPin];
  }

  // Check 2-digit prefix in offline lookup table
  const prefix = cleanPin.slice(0, 2);
  const fallback = PINCODE_REGION_COORDINATES[prefix] || [28.6139, 77.2090];

  // Try fetching precise coordinates from Nominatim (OpenStreetMap) with a short timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json&limit=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geoCache[cleanPin] = coords;
        return coords;
      }
    }
  } catch {
    // Network or timeout failure, use regional fallback
  }

  geoCache[cleanPin] = fallback;
  return fallback;
}

/**
 * Get device GPS coordinates if user allows permission
 */
export function getDeviceCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        resolve(null);
      },
      { timeout: 4000, enableHighAccuracy: true }
    );
  });
}

/**
 * Geographic registry for Indian pincodes to ensure 100% consistent city, area & state display
 */
export const PINCODE_DETAILS = {
  '400001': { area: 'Colaba', city: 'Mumbai', state: 'Maharashtra', full: 'Colaba, Mumbai' },
  '400005': { area: 'Cuffe Parade', city: 'Mumbai', state: 'Maharashtra', full: 'Cuffe Parade, Mumbai' },
  '400020': { area: 'Churchgate', city: 'Mumbai', state: 'Maharashtra', full: 'Churchgate, Mumbai' },
  '400050': { area: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', full: 'Bandra West, Mumbai' },
  '110001': { area: 'Connaught Place', city: 'New Delhi', state: 'Delhi', full: 'Connaught Place, New Delhi' },
  '560001': { area: 'MG Road', city: 'Bengaluru', state: 'Karnataka', full: 'MG Road, Bengaluru' },
  '600001': { area: 'George Town', city: 'Chennai', state: 'Tamil Nadu', full: 'George Town, Chennai' },
  '500001': { area: 'Abids', city: 'Hyderabad', state: 'Telangana', full: 'Abids, Hyderabad' },
  '700001': { area: 'BBD Bagh', city: 'Kolkata', state: 'West Bengal', full: 'BBD Bagh, Kolkata' },
  '411001': { area: 'Pune Camp', city: 'Pune', state: 'Maharashtra', full: 'Pune Camp, Pune' },
  '380001': { area: 'Lal Darwaja', city: 'Ahmedabad', state: 'Gujarat', full: 'Lal Darwaja, Ahmedabad' },
  '302001': { area: 'MI Road', city: 'Jaipur', state: 'Rajasthan', full: 'MI Road, Jaipur' },
  '226001': { area: 'Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', full: 'Hazratganj, Lucknow' },
};

export function getPincodeLocation(pincode, fallbackArea = '') {
  const pin = String(pincode || '').trim();
  if (PINCODE_DETAILS[pin]) {
    return PINCODE_DETAILS[pin];
  }
  return {
    area: fallbackArea || 'Local Area',
    city: 'India',
    state: '',
    full: fallbackArea || (pin ? `Pincode ${pin}` : 'Local Area'),
  };
}
