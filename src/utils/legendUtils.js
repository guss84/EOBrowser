import axios from 'axios';
import Store from '../store';
// helper function extracted from components/Legend/legend.js

import PREDEFINED_LEGENDS from '../components/Legend/legends.json';

/*
returns legend definition from legends.json for provided datasource and layer.
*/
export function findMatchingLegendSpec(datasourceId, layerId) {
  const legendSpec = PREDEFINED_LEGENDS.find(
    l => !!l.match.find(m => m.datasourceId === datasourceId && m.layerId === layerId),
  );
  return legendSpec;
}

/*
returns min and max position for continuous legend
*/

export function getMinMaxPosition(legend) {
  let minPosition = legend.minPosition || 0.0;
  let maxPosition = legend.maxPosition || 1.0;
  legend.gradients.forEach(el => {
    minPosition = Math.min(minPosition, el.position);
    maxPosition = Math.max(maxPosition, el.position);
  });
  return {
    minPosition,
    maxPosition,
  };
}

export function createGradients(legend) {
  const { minPosition, maxPosition } = getMinMaxPosition(legend);
  let gradients = [];
  const rules = legend.gradients.filter(g => g.color).map(r => ({
    ...r,
    relPosition: (r.position - minPosition) / (maxPosition - minPosition),
  }));

  // fill the remaining space at start:
  if (rules[0].relPosition > 0.0) {
    gradients.push({
      startColor: rules[0].color,
      endColor: rules[0].color,
      pos: 0.0,
      size: rules[0].relPosition,
    });
  }
  for (let i = 0; i < rules.length - 1; i++) {
    gradients.push({
      startColor: rules[i].color,
      endColor: rules[i + 1].color,
      pos: rules[i].relPosition,
      size: rules[i + 1].relPosition - rules[i].relPosition,
    });
  }
  // fill the remaining space:
  if (rules[rules.length - 1].relPosition < 1.0) {
    gradients.push({
      startColor: rules[rules.length - 1].color,
      endColor: rules[rules.length - 1].color,
      pos: rules[rules.length - 1].relPosition,
      size: 1.0 - rules[rules.length - 1].relPosition,
    });
  }
  return {
    minPosition,
    maxPosition,
    gradients,
  };
}

/*
get length of text in pixel before rendering
*/

function getTextWidth(txt, fontSize, fontFamily) {
  if (!txt) {
    return 0;
  }
  let element = document.createElement('canvas');
  let context = element.getContext('2d');
  context.font = `${fontSize} ${fontFamily}`;
  return context.measureText(txt).width;
}

/*
create SVG for discrete legend
*/

function createSVGLegendDiscrete(legend) {
  const MARGIN_LEFT = 5;
  const MARGIN_TOP = 5;
  const LEGEND_ITEM_HEIGHT = 30;
  const LEGEND_ITEM_BORDER = 'rgb(119,119,119);';
  const LEGEND_ITEM_WIDTH = '3px';
  const FONT_COLOR = 'black';
  const FONT_SIZE = '18px';
  const FONT_FAMILY = 'Arial';
  const BACKGROUND_COLOR = 'white';

  const { items } = legend;

  const svg = createSVGElement('svg');
  setSVGElementAttributes(svg, {
    height: `${items.length * LEGEND_ITEM_HEIGHT + 2 * MARGIN_TOP}px`,
    style: `background-color: ${BACKGROUND_COLOR}`,
  });

  items.forEach((item, index) => {
    let circle = createSVGElement('circle');
    setSVGElementAttributes(circle, {
      cx: MARGIN_LEFT + LEGEND_ITEM_HEIGHT / 2,
      cy: MARGIN_TOP + LEGEND_ITEM_HEIGHT / 2 + index * LEGEND_ITEM_HEIGHT,
      r: LEGEND_ITEM_HEIGHT / 2 - 4,
      style: `fill: ${item.color}; stroke: ${LEGEND_ITEM_BORDER}; stroke-width: ${LEGEND_ITEM_WIDTH};`,
    });
    svg.appendChild(circle);

    let text = createSVGElement('text');
    setSVGElementAttributes(text, {
      x: MARGIN_LEFT + LEGEND_ITEM_HEIGHT + 5,
      y: MARGIN_TOP + LEGEND_ITEM_HEIGHT / 2 + index * LEGEND_ITEM_HEIGHT,
      'alignment-baseline': 'central',
      style: `fill:${FONT_COLOR}; font-family:${FONT_FAMILY}; font-size:${FONT_SIZE}`,
    });

    text.textContent = item.label;
    svg.appendChild(text);
  });

  let maxLabelWidth = 0;
  maxLabelWidth = Math.max(
    ...items.filter(item => item.label).map(item => getTextWidth(item.label, FONT_SIZE, FONT_FAMILY) + 5),
    maxLabelWidth,
  );
  svg.setAttribute('width', `${maxLabelWidth + 2 * MARGIN_LEFT + LEGEND_ITEM_HEIGHT}px`);

  return new XMLSerializer().serializeToString(svg);
}

/*
create SVG element
*/
const createSVGElement = elem => document.createElementNS('http://www.w3.org/2000/svg', elem);

/*
set SVG element attributes. 
*/

const setSVGElementAttributes = (elem, attributes) => {
  Object.keys(attributes).forEach(key => elem.setAttributeNS(null, key, attributes[key]));
};

/*
create SVG for continous legend
*/

function createSVGLegendContinous(legend) {
  const MARGIN_LEFT = 15;
  const MARGIN_TOP = 15;
  const HEIGHT = 320;
  const LEGEND_WIDTH = 50;
  const LEGEND_HEIGHT = HEIGHT - 2 * MARGIN_TOP;
  const LEGEND_BORDER_COLOR = 'black';
  const LEGEND_BORDER_WIDTH = '2px';
  const FONT_COLOR = 'black';
  const FONT_SIZE = '18px';
  const FONT_FAMILY = 'Arial';
  const BACKGROUND_COLOR = 'white';

  const { gradients, minPosition, maxPosition } = createGradients(legend);
  let items = [];
  Object.assign(items, gradients);

  let ticks = [];
  Object.assign(ticks, legend.gradients);

  //svg container
  const svg = createSVGElement('svg');
  setSVGElementAttributes(svg, {
    height: `${HEIGHT}px`,
    style: `background-color: ${BACKGROUND_COLOR}`,
  });

  //add border
  const border = createSVGElement('rect');
  setSVGElementAttributes(border, {
    x: MARGIN_LEFT,
    y: MARGIN_TOP,
    width: LEGEND_WIDTH,
    height: LEGEND_HEIGHT + 1,
    style: `fill:none;stroke:${LEGEND_BORDER_COLOR}; stroke-width:${LEGEND_BORDER_WIDTH}`,
  });
  svg.appendChild(border);

  //gradient definitions
  const defs = createSVGElement('defs');
  svg.appendChild(defs);

  items.forEach((item, index) => {
    const itemHeight = LEGEND_HEIGHT * item.size;
    let linearGradient = createSVGElement('linearGradient');
    setSVGElementAttributes(linearGradient, {
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%',
      id: `id${index}`,
    });
    //add stops to gradient
    const stops = [
      {
        color: item.endColor,
        offset: '0%',
      },
      {
        color: item.startColor,
        offset: '100%',
      },
    ];

    stops.forEach(s => {
      let stop = createSVGElement('stop');
      setSVGElementAttributes(stop, {
        offset: s.offset,
        'stop-color': s.color,
      });
      linearGradient.appendChild(stop);
    });
    //add gradient to definiton
    defs.appendChild(linearGradient);

    let rect = createSVGElement('rect');
    setSVGElementAttributes(rect, {
      x: MARGIN_LEFT,
      y: MARGIN_TOP + LEGEND_HEIGHT * (1 - item.pos - item.size),
      width: LEGEND_WIDTH,
      height: itemHeight + 1,
      style: `fill:url(#id${index});stroke:none`,
    });

    svg.appendChild(rect);
  });

  //add ticks
  ticks.forEach(line => {
    if (line.label) {
      let l = createSVGElement('line');
      const pos = (1 - (line.position - minPosition) / (maxPosition - minPosition)) * LEGEND_HEIGHT;
      setSVGElementAttributes(l, {
        x1: MARGIN_LEFT + LEGEND_WIDTH,
        x2: MARGIN_LEFT + LEGEND_WIDTH + 5,
        y1: MARGIN_TOP + pos,
        y2: MARGIN_TOP + pos,
        style: `stroke: ${FONT_COLOR}`,
      });
      svg.appendChild(l);
    }
  });

  //add labels
  ticks.forEach(item => {
    if (item.label) {
      let text = createSVGElement('text');
      const pos = (1 - (item.position - minPosition) / (maxPosition - minPosition)) * LEGEND_HEIGHT;
      setSVGElementAttributes(text, {
        x: MARGIN_LEFT + LEGEND_WIDTH + 10,
        y: MARGIN_TOP + pos + 5,
        style: `fill: ${FONT_COLOR}; font-family: ${FONT_FAMILY}; font-size  : ${FONT_SIZE};`,
      });
      text.textContent = item.label;
      svg.appendChild(text);
    }
  });
  //calculate max label width
  let maxLabelWidth = 0;
  maxLabelWidth = Math.max(
    ...ticks.filter(t => t.label).map(val => getTextWidth(val.label, FONT_SIZE, FONT_FAMILY) + 10),
    maxLabelWidth,
  );

  //set svg width
  setSVGElementAttributes(svg, {
    width: `${maxLabelWidth + 2 * MARGIN_LEFT + LEGEND_WIDTH}px`,
  });
  return new XMLSerializer().serializeToString(svg);
}

const createSVGLegend = legendSpec =>
  legendSpec.legend.type === 'discrete'
    ? createSVGLegendDiscrete(legendSpec.legend)
    : createSVGLegendContinous(legendSpec.legend);

const loadLegendDefinition = url =>
  new Promise((resolve, reject) => {
    axios(url)
      .then(res => resolve({ legend: res.data }))
      .catch(e => reject(e));
  });

export async function getLegendImageURL(legendData) {
  if (!legendData) {
    throw new Error('Legend data is null');
  }

  let legendSpec = findMatchingLegendSpec(legendData.datasourceId, legendData.layerId);
  let xmlData = undefined;
  if (legendSpec) {
    try {
      xmlData = createSVGLegend(legendSpec);
      return 'data:image/svg+xml;base64,' + b64EncodeUnicode(xmlData);
    } catch (e) {
      throw new Error(`Unable to create legend from json definition:${e}`);
    }
  }

  if (legendData.legendDefinitionJsonUrl) {
    try {
      const jsonData = await loadLegendDefinition(legendData.legendDefinitionJsonUrl);
      xmlData = createSVGLegend(jsonData);
      return 'data:image/svg+xml;base64,' + b64EncodeUnicode(xmlData);
    } catch (e) {
      throw new Error(`Unable to create legend from json url:${e}`);
    }
  }

  return legendData.legendUrl;
}

/*
Get legend data from presets. Legend data is put in presets when handeling GetCapabilities request.
*/

export const extractLegendDataFromPreset = (datasourceId, datasourceName, layerId) => {
  const preset = Store.current.presets[datasourceName].find(preset => preset.id === layerId);
  const hasLegend =
    preset &&
    (findMatchingLegendSpec(datasourceId, layerId) || preset.legendUrl || preset.legendDefinitionJsonUrl);

  const legendData = hasLegend
    ? {
        legendUrl: preset.legendUrl,
        legendDefinitionJsonUrl: preset.legendDefinitionJsonUrl,
        datasourceId,
        layerId: layerId,
      }
    : undefined;
  return legendData;
};

//encode unicode string
//https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_4_%E2%80%93_escaping_the_string_before_encoding_it
function b64EncodeUnicode(str) {
  // first we use encodeURIComponent to get percent-encoded UTF-8,
  // then we convert the percent encodings into raw bytes which
  // can be fed into btoa.
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
      return String.fromCharCode('0x' + p1);
    }),
  );
}
