import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
import FileSaver from 'file-saver';
import moment from 'moment';
import copernicus from '../assets/copernicus.png';
import SHlogo from '../assets/shLogo.png';
import Store from '../store';
import { getMapDOMSize } from './coords';
import { IMAGE_FORMATS } from '../store/config';
import { downloadFromShadow } from './downloadMap';
import { getLegendImageURL } from './legendUtils';
import { getMap, GetMapAPI } from 'sentinelhub-js';
const FONT_FAMILY = 'Helvetica, Arial, sans-serif';
const FONT_BASE = 960;
const PARTITION_PADDING = 5;
const FONT_SIZES = {
  normal: { base: 6.5016, min: 11 },
  copyright: { base: 5, min: 9 },
};

const SCALEBAR_LEFT_PADDING = 10;

function getWrappedLines(ctx, text, maxWidth) {
  let lines = [];
  let line = '';
  let lineTest = '';
  let words = text.split(' ');
  for (let word of words) {
    lineTest = line + word + ' ';

    if (ctx.measureText(lineTest).width > maxWidth) {
      lines.push(line);
      line = word + ' ';
    } else {
      line = lineTest;
    }
  }

  if (line.length > 0) {
    lines.push(line.trim());
  }

  return lines;
}

function getFontSize(width, font) {
  // y = 0.0048x + 6.5016
  const size = Math.max(4.4 / FONT_BASE * width + FONT_SIZES[font].base, FONT_SIZES[font].min);
  return size;
}

function getFont(width, { font, bold }) {
  const size = getFontSize(width, font);
  return ` ${bold ? 'Bold' : ''} ${Math.round(size)}px  ${FONT_FAMILY}`;
}

function getTextWidth(ctx, text, font) {
  ctx.font = font;
  const widthObj = ctx.measureText(text);
  return widthObj.width;
}

function drawDescription(ctx, containerWidth, containerHeight, title, userDescription) {
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  const normalFont = getFont(ctx.canvas.width, { font: 'normal', bold: false });
  const userDescriptionFont = getFont(ctx.canvas.width, { font: 'normal', bold: true });
  const titleWidth = getTextWidth(ctx, title, normalFont);
  const userDescriptionWidth = getTextWidth(ctx, userDescription, userDescriptionFont);
  const totalTextWidth = titleWidth + userDescriptionWidth;
  const x = containerWidth / 2 - totalTextWidth / 2;
  const y = containerHeight / 2;

  ctx.font = userDescriptionFont;
  ctx.fillText(userDescription, x, y);
  ctx.font = normalFont;
  ctx.fillText(title, x + userDescriptionWidth, y);
}

function getLowerYAxis(ctx) {
  return ctx.canvas.height * 0.99;
}

function getScalebar(canvasWidth) {
  const scaleBar = document.querySelector('.leaflet-control-scale-line');
  const mapDOMSize = getMapDOMSize();
  return { text: scaleBar.innerHTML, width: scaleBar.offsetWidth * canvasWidth / mapDOMSize.width };
}

function getScalebarWidth(ctx) {
  const { width, text } = getScalebar(ctx.canvas.width);
  const textWidth = ctx.measureText(text);
  return width + textWidth.width + SCALEBAR_LEFT_PADDING + 20;
}

function getScalebarHeight(ctx) {
  return ctx.canvas.height * 0.016;
}

function drawScalebar(ctx) {
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#fff';
  const strokeRatio = 1 / 900;
  ctx.lineWidth = Math.round(Math.max(ctx.canvas.width * strokeRatio, 1));
  ctx.beginPath();
  const scalebar = getScalebar(ctx.canvas.width);
  const yAxisLineLength = getScalebarHeight(ctx);
  const baseLine = getLowerYAxis(ctx);
  ctx.moveTo(SCALEBAR_LEFT_PADDING, baseLine - yAxisLineLength);
  ctx.lineTo(SCALEBAR_LEFT_PADDING, baseLine);
  ctx.lineTo(scalebar.width + SCALEBAR_LEFT_PADDING, baseLine);
  ctx.lineTo(scalebar.width + SCALEBAR_LEFT_PADDING, baseLine - yAxisLineLength);
  //halfway mark
  ctx.moveTo(scalebar.width / 2 + SCALEBAR_LEFT_PADDING, baseLine);
  ctx.lineTo(scalebar.width / 2 + SCALEBAR_LEFT_PADDING, baseLine - yAxisLineLength / 2);
  ctx.stroke();
  //scalebar text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = getFont(ctx.canvas.width, { font: 'normal', bold: false });
  ctx.fillText(scalebar.text, scalebar.width + 20, baseLine);
}

function drawTextBoxBackground(ctx, width, height) {
  ctx.fillStyle = 'rgba(44,48,51,0.7)';
  ctx.fillRect(0, 0, width, height);
}

function drawCopyrightText(ctx, text, copyrightPartitionX, copyrightPartitionWidth, baselineY) {
  const x = copyrightPartitionX + copyrightPartitionWidth / 2;
  const fontSize = getFontSize(ctx.canvas.width, 'copyright');
  const lineHeight = fontSize;
  ctx.font = getFont(ctx.canvas.width, { font: 'copyright', bold: false });
  ctx.textAlign = 'center';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const lines = getWrappedLines(ctx, text, copyrightPartitionWidth);
  lines.forEach((line, index) => {
    const y = baselineY - (lines.length - index - 1) * lineHeight;
    ctx.fillText(line, x, y);
  });
}

function drawLogos(ctx, copernicusLogo, sentinelHubLogo, logosPartitionWidth, bottomY) {
  const proposedWidth = Math.max(ctx.canvas.width * 0.05, 50);
  const ratio = proposedWidth / copernicusLogo.width;
  const imagePadding = 10;

  const copernicusLogoWidth = copernicusLogo.width * ratio;
  const copernicusLogoHeight = copernicusLogo.height * ratio;

  const sentinelHubLogoWidth = sentinelHubLogo.width * ratio;
  const sentinelHubLogoHeight = sentinelHubLogo.height * ratio;

  const allImagesWidth = sentinelHubLogoWidth + copernicusLogoWidth;

  let copernicusLogoX;
  let copernicusLogoY;
  let sentinelHubLogoX;
  let sentinelHubLogoY;

  if (allImagesWidth > logosPartitionWidth) {
    sentinelHubLogoX = ctx.canvas.width - copernicusLogoWidth - imagePadding;
    sentinelHubLogoY = bottomY - sentinelHubLogoHeight * 0.8; // Capital letter in image is large, so offset image y postition
    copernicusLogoX = ctx.canvas.width - copernicusLogoWidth - imagePadding;
    copernicusLogoY = sentinelHubLogoY - copernicusLogoHeight - 2;
  } else {
    copernicusLogoX = ctx.canvas.width - allImagesWidth - imagePadding * 2;
    copernicusLogoY = bottomY - copernicusLogoHeight * 0.85; // Capital letter in image is large, so offset image y postition
    sentinelHubLogoX = copernicusLogoX + copernicusLogoWidth + imagePadding;
    sentinelHubLogoY = bottomY - sentinelHubLogoHeight * 0.8;
  }

  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(copernicusLogo, copernicusLogoX, copernicusLogoY, copernicusLogoWidth, copernicusLogoHeight);
  ctx.drawImage(
    sentinelHubLogo,
    sentinelHubLogoX,
    sentinelHubLogoY,
    sentinelHubLogoWidth,
    sentinelHubLogoHeight,
  );
}

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject('Error fetching image: url is empty!');
      return;
    }
    const img = document.createElement('img');
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = e => {
      reject(`Error fetching image: ${url} ${e}`);
    };
    img.src = url;
  });
}

async function drawMapOverlays(ctx, originalMap) {
  const { mapBounds } = Store.current;
  const overlayCanvas = await downloadFromShadow(originalMap, mapBounds, ctx.canvas.width, ctx.canvas.height);
  return overlayCanvas;
}

async function drawSHGetMapOnCanvas(ctx, url) {
  // since we already have the URL by the time we want to call sentinelhub-js' GetMap, we need to parse
  // params from URL again: (not proud, but any other solution would be... more involved :) )
  function getJsonFromUrl(urlParams) {
    var result = {};
    urlParams.split('&').forEach(function(part) {
      var item = part.split('=');
      result[item[0].toLowerCase()] = decodeURIComponent(item[1]);
    });
    return result;
  }

  const [baseUrl, urlParams] = url.split('?');
  const params = getJsonFromUrl(urlParams);
  return await drawHugeMapOnCanvas(ctx, GetMapAPI.SentinelHubWms, baseUrl, params);
}

async function drawHugeMapOnCanvas(ctx, api, baseUrl, params) {
  const LIMIT_DIM = 2000;
  const xSplitBy = Math.ceil(params.width / LIMIT_DIM);
  const chunkWidth = Math.ceil(params.width / xSplitBy);
  const ySplitBy = Math.ceil(params.height / LIMIT_DIM);
  const chunkHeight = Math.ceil(params.height / ySplitBy);

  const [lng0, lat0, lng1, lat1] = params.bbox.split(',').map(l => Number(l));
  const xToLng = x => Math.round(Math.min(lng0, lng1) + x / params.width * Math.abs(lng1 - lng0));
  const yToLat = y => Math.round(Math.max(lat0, lat1) - y / params.height * Math.abs(lat1 - lat0));

  for (let x = 0; x < params.width; x += chunkWidth) {
    const xTo = Math.min(x + chunkWidth, params.width);
    for (let y = 0; y < params.height; y += chunkHeight) {
      const yTo = Math.min(y + chunkHeight, params.height);
      const paramsChunk = {
        ...params,
        width: xTo - x,
        height: yTo - y,
        bbox: [xToLng(x), yToLat(y), xToLng(xTo), yToLat(yTo)],
      };
      const blob = await getMap(api, baseUrl, paramsChunk);
      drawBlobOnCanvas(ctx, blob, x, y);
    }
  }
  // the last image is sometimes simply not drawn for some reason (4000x7000 image, chunk
  // size 2000, ff on linux), so this workaround waits for 20ms to "fix" this:
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 20);
  });
}

async function drawBlobOnCanvas(ctx, blob, x, y) {
  const objectURL = URL.createObjectURL(blob);
  // wait until objectUrl is drawn on the image, so you can safely draw img on canvas:
  const imgDrawn = await new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      reject('Could not load image from blob');
    };
    img.src = objectURL;
  });
  ctx.drawImage(imgDrawn, x, y);
  URL.revokeObjectURL(objectURL);
}

async function createCanvasBlob(obj, imageFormat, leafletLayers, showCaptions, addMapoverlays, showLegend) {
  const canvas = document.createElement('canvas');
  const { width, height, url, title, userDescription, copyrightText, legendData } = obj;

  const mainImg = document.createElement('img');
  const sentinelHubLogo = document.createElement('img');
  sentinelHubLogo.crossOrigin = 'Anonymous';
  sentinelHubLogo.src = SHlogo;
  const cpImg = document.createElement('img');
  cpImg.src = copernicus;
  cpImg.crossOrigin = 'Anonymous';
  mainImg.crossOrigin = 'Anonymous';
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  await drawSHGetMapOnCanvas(ctx, url);

  if (addMapoverlays) {
    const overlayCanvas = await drawMapOverlays(ctx, leafletLayers);
    ctx.drawImage(overlayCanvas, 0, 0);
  }
  if (showCaptions) {
    const TOP_RECT_SIZE = { width: canvas.width, height: canvas.height * 0.04 };
    const scalebarPartitionWidth = Math.max(getScalebarWidth(ctx), canvas.width * 0.33);
    const copyrightPartitionWidth = (canvas.width - scalebarPartitionWidth) * 0.6 - PARTITION_PADDING;
    const logosPartitionWidth = (canvas.width - scalebarPartitionWidth) * 0.4 - PARTITION_PADDING;

    const bottomYAxis = getLowerYAxis(ctx);

    const copyrightPartitionXCoords = scalebarPartitionWidth + PARTITION_PADDING;

    drawTextBoxBackground(ctx, TOP_RECT_SIZE.width, TOP_RECT_SIZE.height);
    drawDescription(ctx, TOP_RECT_SIZE.width, TOP_RECT_SIZE.height, title, userDescription);
    drawScalebar(ctx);
    drawLogos(ctx, cpImg, sentinelHubLogo, logosPartitionWidth, bottomYAxis);
    drawCopyrightText(ctx, copyrightText, copyrightPartitionXCoords, copyrightPartitionWidth, bottomYAxis);
  }

  if (showLegend && legendData) {
    try {
      const legendUrl = await getLegendImageURL(legendData);
      const legendImage = await loadImage(legendUrl);
      drawLegendImage(ctx, legendImage, true, showCaptions);
    } catch (e) {
      //just print error message and skip drawing legend
      console.error('Error drawing legend', e);
    }
  }
  const dataurl = canvas.toDataURL(imageFormat);
  const urlBlob = dataURLtoBlob(dataurl);
  return urlBlob;
}

function drawLegendImage(ctx, legendImage, left, showCaptions) {
  if (legendImage === null || legendImage === undefined) {
    return;
  }
  const initialWidth = ctx.canvas.width * 0.05; //5%
  let ratio = initialWidth / legendImage.width;
  if (ratio < 0.6) {
    ratio = 0.6;
  }
  if (ratio > 1) {
    ratio = 1;
  }

  const legendWidth = Math.round(legendImage.width * ratio);
  const legendHeight = Math.round(legendImage.height * ratio);
  let legendX;
  let legendY;
  if (left) {
    legendX = SCALEBAR_LEFT_PADDING;
  } else {
    legendX = ctx.canvas.width - legendWidth - SCALEBAR_LEFT_PADDING;
  }
  legendY =
    (showCaptions ? getLowerYAxis(ctx) : ctx.canvas.height) -
    legendHeight -
    (showCaptions ? getScalebarHeight(ctx) + 10 : 10);

  ctx.lineJoin = 'round';
  ctx.lineWidth = '1';
  ctx.strokeStyle = 'black';
  ctx.strokeRect(legendX - 1, legendY - 1, legendWidth + 2, legendHeight + 2);

  ctx.drawImage(
    legendImage,
    0,
    0,
    legendImage.width,
    legendImage.height,
    legendX,
    legendY,
    legendWidth,
    legendHeight,
  );
}

async function getImgObject(customObject = {}, imageFormat, imgWmsUrl, imageW, imageH, userDescription) {
  let { name, time, datasource } = Store.current.selectedResult;
  const preset = customObject.preset || Store.current.selectedResult.preset;
  const { presets, instances } = Store.current;
  const imageExt = IMAGE_FORMATS.find(f => f.value === imageFormat).ext;
  const { name: cName, preset: cPreset, time: cTime, url: cUrl, legendData } = customObject;
  const presetName = presets[datasource].find(p => p.id === (cPreset || preset));

  const interestedDatasource = instances.find(instance => instance.name === datasource);
  const copyrightText = datasource.includes('Sentinel')
    ? `Credit: European Union, contains modified Copernicus Sentinel data ${moment
        .utc()
        .format('YYYY')}, processed with EO Browser`
    : '';

  if (interestedDatasource.constructSpacecraftInfo) {
    const mapBounds = Store.current.mapBounds;
    const fromMoment = moment(time).startOf('day');
    const toMoment = moment(time).endOf('day');

    const { tiles } = await interestedDatasource.getTilesFromIndexService(mapBounds, fromMoment, toMoment);
    name = interestedDatasource.constructSpacecraftInfo(tiles);
  }

  const title = `${cTime || time}, ${cName || name}, ${presetName ? presetName.name : cPreset || preset}`;
  // use custom object or default for rendering image
  return {
    url: cUrl || imgWmsUrl,
    title,
    width: imageW,
    height: imageH,
    imageExt,
    userDescription: userDescription && userDescription.length > 0 ? `${userDescription}, ` : '',
    copyrightText,
    legendData,
  };
}

async function downloadCanvas(
  customObj,
  imageFormat,
  imgWmsUrl,
  imageW,
  imageH,
  userDescription,
  leafletLayers,
  showCaptions,
  addMapoverlays,
  showLegend,
) {
  return new Promise((resolve, reject) => {
    getImgObject(customObj, imageFormat, imgWmsUrl, imageW, imageH, userDescription).then(obj => {
      createCanvasBlob(obj, imageFormat, leafletLayers, showCaptions, addMapoverlays, showLegend)
        .then(blob => {
          let element = document.createElement('a');
          element.setAttribute('href', URL.createObjectURL(blob));
          element.setAttribute('download', `${obj.title}.${obj.imageExt}`);

          element.style.display = 'none';
          document.body.appendChild(element);

          element.click();

          let clickHandler;
          element.addEventListener(
            'click',
            (clickHandler = function() {
              // ..and to wait a frame
              requestAnimationFrame(function() {
                URL.revokeObjectURL(element.href);
              });

              element.removeAttribute('href');
              element.removeEventListener('click', clickHandler);
            }),
          );
          document.body.removeChild(element);
          resolve();
        })
        .catch(err => {
          console.error(err);
          reject(err);
        });
    });
  });
}
function dataURLtoBlob(dataurl) {
  var parts = dataurl.split(','),
    mime = parts[0].match(/:(.*?);/)[1];
  if (parts[0].indexOf('base64') !== -1) {
    var bstr = atob(parts[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  } else {
    var raw = decodeURIComponent(parts[1]);
    return new Blob([raw], { type: mime });
  }
}
export function downloadOne(
  layerUrl,
  imageFormat,
  imgWmsUrl,
  imageH,
  imageW,
  userDescription,
  leafletLayers,
  showCaptions,
  addMapoverlays,
  showLegend,
) {
  return new Promise((resolve, reject) => {
    const { preset, src, legendData } = layerUrl;
    if (['image/png', 'image/jpeg'].includes(imageFormat)) {
      downloadCanvas(
        { url: src, preset, legendData },
        imageFormat,
        imgWmsUrl,
        imageH,
        imageW,
        userDescription,
        leafletLayers,
        showCaptions,
        addMapoverlays,
        showLegend,
      )
        .then(blob => {
          resolve();
        })
        .catch(err => {
          console.error('Could not download files', err);
          reject(`Could not download files: ${err.message}`);
        });
    } else {
      reject("Can't download via canvas");
    }
  });
}
export function downloadZipIt(
  layerUrls,
  imageFormat,
  imgWmsUrl,
  imageW,
  imageH,
  userDescription,
  addAnotations,
) {
  const zip = new JSZip();
  let count = 0;
  const imageExt = IMAGE_FORMATS.find(f => f.value === imageFormat).ext;
  const zipFilename = 'EO_Browser_images.zip';
  return new Promise((resolve, reject) => {
    layerUrls.forEach(layer => {
      //new
      const { preset, src, legendData } = layer;
      if (addAnotations) {
        getImgObject(
          { url: src, preset, legendData },
          imageFormat,
          imgWmsUrl,
          imageW,
          imageH,
          userDescription,
        ).then(defaultObj => {
          createCanvasBlob(defaultObj, imageFormat)
            .then(blob => {
              zip.file(`${defaultObj.title}.${defaultObj.imageExt}`, blob, {
                binary: true,
              });
              count++;
              if (count === layerUrls.length) {
                zip
                  .generateAsync({ type: 'blob' })
                  .then(content => {
                    FileSaver.saveAs(content, zipFilename);
                    resolve();
                  })
                  .catch(err => {
                    reject(`Could not ZIP files: ${err.message}`);
                  });
              }
            })
            .catch(err => {
              console.error(err);
            });
          count++;
          if (count === layerUrls.length) {
            zip
              .generateAsync({ type: 'blob' })
              .then(content => {
                FileSaver.saveAs(content, zipFilename);
                resolve();
              })
              .catch(err => {
                reject(`Could not ZIP files: ${err.message}`);
              });
          }
        });
      } else {
        JSZipUtils.getBinaryContent(src, (err, data) => {
          if (err) {
            reject(`There was a problem downloading image`);
            return;
          }
          if (!err) {
            getImgObject({ url: src, preset }, imageFormat, imgWmsUrl, imageW, imageH).then(defaultObj => {
              zip.file(`${defaultObj.title}.${imageExt}`, data, {
                binary: true,
              });
              count++;
              if (count === layerUrls.length) {
                zip
                  .generateAsync({ type: 'blob' })
                  .then(content => {
                    FileSaver.saveAs(content, zipFilename);
                    resolve();
                  })
                  .catch(err => {
                    reject(`Could not ZIP files: ${err.message}`);
                  });
              }
            });
          }
        });
      }

      // loading a file and add it in a zip file
    });
  });
}
