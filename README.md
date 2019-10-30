## About

The Earth Observation Browser is a search tool for Sentinel-2 and Landsat 5,7,8 satellite imagery. It was released as open-source to bring earth observation imagery closer to its end users.
Some features:

* Search by date, location, source, and cloud coverage
* Tweak imagery rendering parameters and settings on-the-fly, similar to [Sentinel Playground](http://apps.sentinel-hub.com/sentinel-playground/)
* Pin your results and make opacity or split image comparisons of pinned tiles

<img src="eobrowser.jpg" />

## Usage

* Run `npm install` or `yarn`
* Run `npm start`
* Use Sentinel username and password (if you don't have any, contact [Sentinel Hub](www.sentinel-hub.com))

## BUILDING

* yarn build:production
* yarn build:staging

## Deploying

* If you want to deploy to IPT, be sure to comment line in `.env` with # in front of `REACT_APP_TARGET` so that it doesn't targets AWS instances and logic. `homepage` is `http://apps.eocloud.sentinel-hub.com/eo-browser/`
* If you want to deploy to Sentinel App (Sentinel 2 is served from AWS), `.env` needs to have line `REACT_APP_TARGET=aws` uncommented. `homepage` is `http://apps.sentinel-hub.com/eo-browser/`
* If you want to deploy to AWS Image bucket (Sentinel 2 is served from AWS), `.env` needs to have line `REACT_APP_IMAGE_BUCKET=true` uncommented. `homepage` is `http://sentinel-pds.s3-website.eu-central-1.amazonaws.com/browser/`
* If you want to deploy to Sentinel Hub Image browser, `.env` needs to have line `REACT_APP_IMAGE_BUCKET=true` uncommented and switch `$primaryCol` in variables. `homepage` is `http://apps.sentinel-hub.com/image-browser/`
* Then you need to modify `homepage` in ``package.json` to point to your deploy host URL.
* The run `npm run build` and put whole folder to desired server.

