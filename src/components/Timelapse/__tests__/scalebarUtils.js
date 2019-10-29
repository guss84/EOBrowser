import { scalebarPixelWidthAndDistance } from '../scalebarUtils';

it('get scale width in pixels', () => {
  const testScaleParams = [
    { mppx: 5, expectedResult: { widthPx: 50, label: '250 m' } },
    { mppx: 10, expectedResult: { widthPx: 50, label: `500 m` } },
    { mppx: 20, expectedResult: { widthPx: 50, label: '1 km' } },
    { mppx: 40, expectedResult: { widthPx: 50, label: '2 km' } },
    { mppx: 60, expectedResult: { widthPx: 50, label: '3 km' } },
  ];
  testScaleParams.forEach(({ mppx, expectedResult }) => {
    expect(scalebarPixelWidthAndDistance(mppx)).toEqual(expectedResult);
  });
});
