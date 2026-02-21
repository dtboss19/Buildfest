export const ST_THOMAS_ORIGIN = '2115 Summit Ave, St Paul, MN 55105';

export function googleMapsPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=16`;
}

export function googleMapsTransitUrl(destinationAddress: string): string {
  const params = new URLSearchParams({
    api: '1',
    origin: ST_THOMAS_ORIGIN,
    destination: destinationAddress,
    travelmode: 'transit',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function metroTransitTripPlannerUrl(): string {
  return 'https://www.metrotransit.org/trip-planner';
}
