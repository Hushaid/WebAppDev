"use client"

export interface GpsPosition {
  lat: number
  lng: number
  accuracy: number
}

export function captureGps(): Promise<GpsPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied."))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location unavailable."))
            break
          case error.TIMEOUT:
            reject(new Error("Location request timed out."))
            break
          default:
            reject(new Error("Failed to get location."))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
  })
}
