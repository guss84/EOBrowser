# "INTERNAL" BACKEND API DOCS

## PUBLIC API DOCS
 https://docs.sentinel-hub.com/api/latest/reference/?service=configuration
 
## INTERNAL DOCS
 needs VPN
 
https://internal.sentinel-hub.com/docs/

## INDEX SERVICE

There are two versions of indexService interface (`v1`/`v2` - EO Cloud  and `v3` - AWS). They all expect a region of interest, allowed time frame, max number of results and applicable additional parameters.

Note that one needs to be careful when fetching huge time range as it puts a strain on the service (because of combination with spatial indices).

### v1 / v2 (EO Cloud)

Note: some parameters are specified as query parameters, others in JSON encoded body.

Endpoints:
```
s1 => https://eocloud.sentinel-hub.com/index/s1/v1/search
s3 => https://eocloud.sentinel-hub.com/index/s3/v1/search
envisat => https://eocloud.sentinel-hub.com/index/envisat/v1/search
landsat5 => https://eocloud.sentinel-hub.com/index/landsat5/v2/search
landsat7 => https://eocloud.sentinel-hub.com/index/landsat7/v2/search
landsat8 => https://eocloud.sentinel-hub.com/index/landsat8/v2/search
```

Example request:
```
$ curl -i -X POST 'https://eocloud.sentinel-hub.com/index/s1/v1/search?expand=true&timefrom=2000-06-01T12:00:00&timeto=2018-07-02T23:59:42&maxcount=50&offset=0&priority=leastRecent' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'
```

Sorting parameter `priority` can be `leastRecent`, `mostRecent` or `leastCC` (for Landsat datasources).

Sentinel-1 supports additional parameters `acquisitionMode`, `polarization`, `productType` and `resolution`. Not all combinations of these parameters are supported though - apart from default (IW) there are two other combinations available:
```
$ curl -i -X POST 'https://eocloud.sentinel-hub.com/index/s1/v1/search?expand=true&timefrom=2000-06-01T12:00:00&timeto=2018-07-02T23:59:42&maxcc=NaN&maxcount=50&offset=0&acquisitionMode=EW&polarization=DH&productType=GRD&resolution=MEDIUM' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'

$ curl -i -X POST 'https://eocloud.sentinel-hub.com/index/s1/v1/search?expand=true&timefrom=2000-06-01T12:00:00&timeto=2018-07-02T23:59:42&maxcc=NaN&maxcount=50&offset=0&acquisitionMode=EW&polarization=SH&productType=GRD&resolution=MEDIUM' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'
```

Landsat datasources support `maxcc` parameter with values from 0.0 to 1.0:
```
$ curl -i -X POST 'https://eocloud.sentinel-hub.com/index/landsat5/v2/search?expand=true&timefrom=2011-05-01T12:00:00&timeto=2011-05-20T23:59:42&maxcc=0.01&maxcount=50&offset=0' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'
```

### v3 (AWS, S-5 on EO Cloud, BYOC)

Endpoints:
```
S2L1C => https://services.sentinel-hub.com/index/v3/collections/S2L1C/searchIndex
S2L2A => https://services.sentinel-hub.com/index/v3/collections/S2L2A/searchIndex
S1GRD => https://services.sentinel-hub.com/index/v3/collections/S1GRD/searchIndex
MODIS => https://services-uswest2.sentinel-hub.com/index/v3/collections/MODIS/searchIndex
L8L1C => https://services-uswest2.sentinel-hub.com/index/v3/collections/L8L1C/searchIndex
S5P => https://eocloud.sentinel-hub.com/index/v3/collections/S5PL2/searchIndex
BYOC => https://services.sentinel-hub.com/byoc/v3/collections/CUSTOM/searchIndex
```

Example request:

```
$ curl -i -X POST https://services.sentinel-hub.com/index/v3/collections/S2L1C/searchIndex -d '{"clipping":{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[11.758117675781252,41.395354710280166],[13.24127197265625,41.395354710280166],[13.24127197265625,42.40115038362433],[11.758117675781252,42.40115038362433],[11.758117675781252,41.395354710280166]]]},"maxcount":50,"offset":0,"maxCloudCoverage":1,"timeFrom":"2018-06-02T08:26:33","timeTo":"2001-07-02T23:59:33"}' -H 'Content-Type: application/json'

$ export COMMON='"clipping":{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[11.758117675781252,41.35413387210046],[13.24127197265625,41.35413387210046],[13.24127197265625,42.44068764258161],[11.758117675781252,42.44068764258161],[11.758117675781252,41.35413387210046]]]},"maxcount":50,"offset":0,"maxCloudCoverage":1,"timeFrom":"2018-08-11T08:15:12.917Z","timeTo":"2018-09-11T08:15:12.917Z"'
$ curl -X POST 'https://services.sentinel-hub.com/index/v3/collections/S1GRD/searchIndex' -H 'Content-Type: application/json;charset=utf-8' -d '{'"$COMMON"', "datasetParameters": { "type": "S1GRD", "polarization": "DV" } }'
```

Sentinel-5 on EO Cloud:
```
$ export COMMON='"clipping":{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[11.758117675781252,41.35413387210046],[13.24127197265625,41.35413387210046],[13.24127197265625,42.44068764258161],[11.758117675781252,42.44068764258161],[11.758117675781252,41.35413387210046]]]},"maxcount":50,"offset":0,"maxCloudCoverage":1,"timeFrom":"2018-12-11T08:15:12.917Z","timeTo":"2018-12-11T18:15:12.917Z"'
$ curl -X POST 'https://eocloud.sentinel-hub.com/index/v3/collections/S5PL2/searchIndex' -H 'Content-Type: application/json;charset=utf-8' -d '{'"$COMMON"', "datasetParameters": { "type": "S5PL2", "productType": "SO2" } }'
```

BYOC:
```
$ export COLLECTION_ID="..."
$ curl -X POST https://services.sentinel-hub.com/byoc/v3/collections/CUSTOM/searchIndex -d '{'"$COMMON"',"maxCloudCoverage":1.0,"maxcount":20,"datasetParameters":{"type":"BYOC","collectionId":"'"$COLLECTION_ID"'"}}'
```

## FIND DATES

This service is similar to index service, except that it:

 - returns only dates (no tile information)
 - does not support paging parameters (`maxcount`, `offset` and `priority`)

### v1 / v2 (EO Cloud)

Endpoints:
```
s1 => https://eocloud.sentinel-hub.com/index/s1/v1/finddates
s3 => https://eocloud.sentinel-hub.com/index/s3/v1/finddates
envisat => https://eocloud.sentinel-hub.com/index/envisat/v1/finddates
landsat5 => https://eocloud.sentinel-hub.com/index/landsat5/v2/dates
landsat7 => https://eocloud.sentinel-hub.com/index/landsat7/v2/dates
landsat8 => https://eocloud.sentinel-hub.com/index/landsat8/v2/dates
```

Example request:
```
curl -i -X POST 'https://eocloud.sentinel-hub.com/index/s1/v1/finddates?timefrom=2018-06-01T00:00:00.000Z&timeto=2018-06-30T23:59:59.999Z' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'
```

Service supports the same set of parameters as index service:
```
$ curl -i -X POST 'https://eocloud.sentinel-hub.com/index/s1/v1/finddates?timefrom=2016-06-01T00:00:00.000Z&timeto=2018-06-30T23:59:59.999Z&acquisitionMode=EW&polarization=DH&productType=GRD&resolution=MEDIUM' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'
```

Landsat datasources support `maxcc` parameter:
```
$ curl -i -X POST 'https://eocloud.sentinel-hub.com/index/landsat5/v2/dates?timefrom=2006-00-01T00:00:00.000Z&timeto=2018-06-30T23:59:59.999Z&maxcc=0.5' -d '{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[10.1239013671875,42.039094188385945],[11.6070556640625,42.039094188385945],[11.6070556640625,43.001634197412876],[10.1239013671875,43.001634197412876],[10.1239013671875,42.039094188385945]]]}' -H 'Content-Type: application/json'
```

### v3 (AWS)

Endpoints:
```
S2L1C => https://services.sentinel-hub.com/index/v3/collections/S2L1C/findAvailableData
S2L2A => https://services.sentinel-hub.com/index/v3/collections/S2L2A/findAvailableData
S1GRD => https://services.sentinel-hub.com/index/v3/collections/S1GRD/findAvailableData
MODIS => https://services-uswest2.sentinel-hub.com/index/v3/collections/MODIS/findAvailableData
L8L1C => https://services-uswest2.sentinel-hub.com/index/v3/collections/L8L1C/findAvailableData
```

Example request:
```
$ curl -i -X POST 'https://services.sentinel-hub.com/index/v3/collections/S2L1C/findAvailableData' -d '{"queryArea":{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[9.841003417968752,42.91922355466844],[11.32415771484375,42.91922355466844],[11.32415771484375,43.86819814895608],[9.841003417968752,43.86819814895608],[9.841003417968752,42.91922355466844]]]},"from":"2018-07-01T00:00:00.000Z","to":"2018-07-31T23:59:59.999Z","maxCloudCoverage":1}' -H 'Content-Type: application/json'
```

Sentinel-1 with parameters:
```
$ export COMMON='"queryArea":{"type":"Polygon","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},"coordinates":[[[11.758117675781252,41.35413387210046],[13.24127197265625,41.35413387210046],[13.24127197265625,42.44068764258161],[11.758117675781252,42.44068764258161],[11.758117675781252,41.35413387210046]]]},"from":"2018-08-11T08:15:12.917Z","to":"2018-09-11T08:15:12.917Z"'
$ curl -X POST 'https://services.sentinel-hub.com/index/v3/collections/S1GRD/findAvailableData' \
  -H 'Content-Type: application/json;charset=utf-8' --data '{'"$COMMON"', "datasetParameters": { "type": "S1GRD", "orbitDirection": "DESCENDING" } }'
$ curl -X POST 'https://services.sentinel-hub.com/index/v3/collections/S1GRD/findAvailableData' \
  -H 'Content-Type: application/json;charset=utf-8' --data '{'"$COMMON"', "datasetParameters": { "type": "S1GRD", "acquisitionMode": "IW" }
```

## USER CONFIGURATION INSTANCES

```
$ curl -X GET 'https://services.sentinel-hub.com/configuration/v1/wms/instances' -H "Authorization: Bearer $BEARER"
[
    {
        "@id": "https://services.sentinel-hub.com/configuration/v1/wms/instances/40f0a339-0444-471e-87f1-bd5a15dc0ce4",
        "additionalData": {
            "imageQuality": 80,
            "showLogo": true,
            "showWarnings": false
        },
        "id": "40f0a339-0444-471e-87f1-bd5a15dc0ce4",
        "layers": {
            "@id": "https://services.sentinel-hub.com/configuration/v1/wms/instances/40f0a339-0444-471e-87f1-bd5a15dc0ce4/layers"
        },
        "name": "S1 aws",
        "userId": "30641222-602c-40b5-8455-db3997d5cd24"
    },
...
```

## LAYERS

Once we have the instance ID and service domain, we can fetch the list of layers with all the details; this
will let us construct queries against datasources.

### v1 / v2 (EO Cloud)
```
$ curl 'http://services.eocloud.sentinel-hub.com/v1/config/instance/instance.e3e5e6c2-d1eb-419a-841c-5167a1de5441?scope=ALL'
$ curl 'http://services.eocloud.sentinel-hub.com/v1/config/instance/instance.6a6b787f-0dda-4153-8ae9-a1729dd0c890?scope=ALL'
```

### v3 (AWS - services.sentinel-hub.com and services-uswest2.sentinel-hub.com)
```
$ curl -X GET 'https://services.sentinel-hub.com/configuration/v1/wms/instances/40f0a339-0444-471e-87f1-bd5a15dc0ce4/layers' -H "Authorization: Bearer $BEARER"
```

Layer user data:
```
$ curl -X GET 'https://services.sentinel-hub.com/configuration/v1/wms/instances/40f0a339-0444-471e-87f1-bd5a15dc0ce4/IW-DV/userData' -H "Authorization: Bearer $BEARER"
```

## FIS
### AWS
AWS service supports FIS requests.  
Notice: FIS will not always return JSON data structure with fields as expected:
```
$ curl 'https://services.sentinel-hub.com/ogc/fis/9bc6d3a0-8f35-42b5-b689-0e20252233b4' -H 'Accept: application/json, text/plain, */*' -H 'Content-Type: application/json;charset=UTF-8' --data-binary '{"layer":"SENTINEL-1-GRD","time":"2019-01-11/2019-01-11","crs":"EPSG:3857","bbox":"2671859,-3978936.009463501,2818618.0942871096,-4061488","resolution":250,"bins":2,"type":"EQUALFREQUENCY"}'
{
    "C0": [
        {
            "date": "2019-01-11",
            "basicStats": {
                "min": 0,
                "max": 0,
                "mean": 0,
                "stDev": 0
            },
            "histogram": {
                "bins": [
                    {
                        "lowEdge": 0,
                        "mean": 0,
                        "count": 48428
                    },...
```
it also returns an empty object {} with response status 200:
```
$ curl 'https://services.sentinel-hub.com/ogc/fis/9bc6d3a0-8f35-42b5-b689-0e20252233b4' -H 'Accept: application/json, text/plain, */*' -H 'Content-Type: application/json;charset=UTF-8' --data-binary '{"layer":"SENTINEL-1-GRD","time":"2019-01-12/2019-01-12","crs":"EPSG:3857","bbox":"2671859,-3978936.009463501,2818618.0942871096,-4061488","resolution":250,"bins":2,"type":"EQUALFREQUENCY"}'
{}
```

### EO Cloud
In theory EO Cloud service supports FIS requests, but they might not be useable due to a bug where all stats are `Infinity` / `-Infinity` / `0` / `NaN`. Example:

```
$ curl 'http://services.eocloud.sentinel-hub.com/v1/fis/2df218c5-3270-4ea4-9b53-5caa6e8119f7?LAYER=SENTINEL_1_GRD_EW&CRS=EPSG:3857&TIME=2019-01-01/2019-01-08&RESOLUTION=30&BBOX=1389319.4261113636,5126784.361143343,1408887.3053523689,5146352.240384347&BINS=2' | json_pp
{
   "GRAY" : [
      {
         "histogram" : {
            "bins" : []
         },
         "date" : "2019-01-08",
         "basicStats" : {
            "min" : "Infinity",
            "mean" : 0,
            "stDev" : "NaN",
            "max" : "-Infinity"
         }
      },
     ...
```

## WMS GetMap overrides for datasources on AWS

When making a `GetMap` request for True color and False color layers of datasources on AWS (Sentinel-2, Landsat-8 USGS and Modis),
the overrides for effects can be sent along with request.
Effects are Gain, Gamma and RGB manipulation.

When making a `GetMap` request, the URL parameter `evalscriptoverrides` must be used for requesting changed images.
This parameter contains stringified values of individual effect and must be base64 encoded.

### Gain

Gain (number) is a single value from range [0, 100] and is available only on layer using visualizers.
Default value is 1.

Add `gainOverride = <gain value>;` to `evalscriptoverrides` in order to change the gain.

### Gamma

Gamma (number) is a single value from range [0.1, 10] and is available only on layers using visualizers.
Default value is 1.

Add `gammaOverrides = <gamma value>;` to `evalscriptoverrides` in order to change the gamma.

### RGB manipulation

RGB manipulation enables control over individual R, G or B channel by specifying a range of each color.

The range for each channel is defined by an array containing the minimum and maximum value of user defined range.
Minimum and maximum must be numbers in the range [0, 1] with minimum being less than or equal to maximum.
Default values are 0 for minimum and 1 for maximum.

RGB manipulation is available only on layers using DefaultVisualizer or HighlightCompressVisualizer.
In custom evalscript, the visualizer's `process()` must be called with value and index, so the visualizer knows which range to use with which value.
Most common usage would be with calling map on components (`components.map((v,i) => process(v,i))`)

Add `rangeOverrides = [ [<red min value>, <red max value>], [<green min value>, <green max value>], [<blue min value>, <blue max value>] ];` to `evalscriptoverrides` in order to manipulate R, G, B channels.


### Making a request with effects

Semicolon after each expression in `evalscriptoverrides` is mandatory, spaces can be omitted.
Make sure to encode the `evalscriptoverrides` string before adding it to the URL.

At the end the request url looks like: `https://<instance url, layer and other parameters>&evalscriptoverrides=<base64-encoded evalscriptoverrides>`

- Example for Sentinel-2 L1C True Color with default effects values:
`https://services.sentinel-hub.com/ogc/wms/cd280189-7c51-45a6-ab05-f96a76067710?service=WMS&request=GetMap&layers=1_TRUE_COLOR&width=512&height=512&evalscriptoverrides=Z2Fpbk92ZXJyaWRlPTE7Z2FtbWFPdmVycmlkZT0xO3JhbmdlT3ZlcnJpZGVzPVtbMCwxXSxbMCwxXSxbMCwxXV07&time=2018-10-03%2F2018-10-03&srs=EPSG%3A3857&bbox=1330615.7883883484,5165920.119625352,1408887.3053523689,5244191.636589374`

  - The `evalscriptoverrides` is base64 encoded - `evalscriptoverrides=Z2Fpbk92ZXJyaWRlPTE7Z2FtbWFPdmVycmlkZT0xO3JhbmdlT3ZlcnJpZGVzPVtbMCwxXSxbMCwxXSxbMCwxXV07`.
  - The decoded value of `evalscriptoverrides` is `gainOverride=1;gammaOverride=1;rangeOverrides=[[0,1],[0,1],[0,1]];`.

- Example for Sentinel-2 L1C True Color with red and green ranges set to [0, 0.2]:
`https://services.sentinel-hub.com/ogc/wms/cd280189-7c51-45a6-ab05-f96a76067710?service=WMS&request=GetMap&layers=1_TRUE_COLOR&width=512&height=512&evalscriptoverrides=Z2Fpbk92ZXJyaWRlPTE7Z2FtbWFPdmVycmlkZT0xO3JhbmdlT3ZlcnJpZGVzPVtbMCwwLjJdLFswLDAuMl0sWzAsMV1dOw%3D%3D&time=2018-10-03%2F2018-10-03&srs=EPSG%3A3857&bbox=1330615.7883883484,5165920.119625352,1408887.3053523689,5244191.636589374`

  - The `evalscriptoverrides` is base64 encoded - `evalscriptoverrides=Z2Fpbk92ZXJyaWRlPTE7Z2FtbWFPdmVycmlkZT0xO3JhbmdlT3ZlcnJpZGVzPVtbMCwwLjJdLFswLDAuMl0sWzAsMV1dOw%3D%3D`.
  - Note that the base64 encoded script must also be escaped into valid URL syntax; `+` becomes `%2B`, `/` becomes `%2F` and `=` becomes `%3D`.
  - The decoded value is `gainOverride=1;gammaOverride=1;rangeOverrides=[[0,0.2],[0,0.2],[0,1]];`.