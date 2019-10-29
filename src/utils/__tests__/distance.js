import { distance } from '../distance';

it('get distance between 2 points', () => {
  const pt1 = [-75.343, 39.984];
  const pt2 = [-75.534, 39.123];

  expect(distance(pt1, pt2)).toEqual(97159.57803131902);
});
