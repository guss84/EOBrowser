function sqr(x) {
  return x * x;
}

export function distance(point1, point2) {
  const dLat = toRad(point2[1] - point1[1]);
  const dLon = toRad(point2[0] - point1[0]);
  const lat1 = toRad(point1[1]);
  const lat2 = toRad(point2[1]);

  const a = sqr(Math.sin(dLat / 2)) + sqr(Math.sin(dLon / 2)) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.asin(Math.sqrt(a));

  const radius = 6373000; //meter

  const distance = radius * c;
  return distance;
}

function toRad(degree) {
  return degree * Math.PI / 180;
}
