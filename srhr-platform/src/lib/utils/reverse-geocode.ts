const cache = new Map<string, string>()

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)!

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`
    const res = await fetch(url, {
      headers: { "User-Agent": "Hushaid-SRHR-Platform/1.0" },
      next: { revalidate: 86400 }, // cache for 24h
    })

    if (!res.ok) return null

    const data = await res.json()
    const addr = data.address
    if (!addr) return null

    // Build a readable location: city/town/village, state, country
    const parts = [
      addr.city || addr.town || addr.village || addr.hamlet || addr.county,
      addr.state,
      addr.country,
    ].filter(Boolean)

    const location = parts.join(", ") || data.display_name || null
    if (location) cache.set(key, location)
    return location
  } catch {
    return null
  }
}
