
const fetch = require('node-fetch');
const qs = require('qs');
require('dotenv').config();

const fedexAccessTokenEndpoint = process.env.NODE_ENV == 'PROD' ? "https://apis.fedex.com/oauth/token" : "https://apis-sandbox.fedex.com/oauth/token";
const fedexTrackingEndpoint = process.env.NODE_ENV == 'PROD' ? "https://apis.fedex.com/track/v1/trackingnumbers" : "https://apis-sandbox.fedex.com/track/v1/trackingnumbers";

let fedexAccessToken = null;
let fedexAccessTokenExpiration = 0;

const refreshFedexAccessToken = async () => {
    const apiKey = process.env.NODE_ENV == 'PROD' ? process.env.FEDEX_PROD : process.env.FEDEX_DEV;
    const apiSecret = process.env.NODE_ENV == 'PROD' ? process.env.FEDEX_PROD_SECRET : process.env.FEDEX_DEV_SECRET;

    const res = await fetch(fedexAccessTokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: qs.stringify({
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: apiSecret
        }),
    });
    const resJson = await res.json();
    fedexAccessToken = resJson.access_token;
    fedexAccessTokenExpiration = Math.floor(Date.now() / 1000) + resJson.expires_in - 60;
};

const getFedexShipmentInfoFromTrackingNum = async (trackingNumbers) => {
    if (!fedexAccessToken || Math.floor(Date.now() / 1000) > fedexAccessTokenExpiration) {
        await refreshFedexAccessToken();
    }

    const trackingNumberInfoArr = trackingNumbers.map(e => {
        return {
            "trackingNumberInfo": {
                "trackingNumber": e
            }
        }
    });
    const res = await fetch(fedexTrackingEndpoint, {
        method: 'POST',
        headers: {
            "accept": "*/*",
            "authorization": `Bearer ${fedexAccessToken}`,
            "content-type": "application/json",
            "x-locale": "en_US",
        },
        body: JSON.stringify({
            "trackingInfo": trackingNumberInfoArr,
            "includeDetailedScans": true
        }),
    });
    const resJson = await res.json();
    const result = resJson.output.completeTrackResults.map(e => {
        if (!e.trackResults || e.trackResults.length == 0) return { trackingNumber: null, status: null, shippingDate: null, deliveryDate: null };
        const trackResults = e.trackResults[0];
        const dateAndTimes = trackResults.dateAndTimes

        let deliveryDate = dateAndTimes ? dateAndTimes.find(d => d.type == 'ACTUAL_DELIVERY')?.dateTime : null;
        if (dateAndTimes && !deliveryDate) {
            deliveryDate = dateAndTimes.find(d => d.type == 'ESTIMATED_DELIVERY')?.dateTime || "Unknown";
        }

        return {
            trackingNumber: e.trackingNumber,
            status: trackResults.latestStatusDetail?.statusByLocale || "Unknown",
            shippingDate: dateAndTimes ? (dateAndTimes.find(d => d.type == 'SHIP')?.dateTime || "Unknown") : "Unknown",
            deliveryDate
        };
    });
    return result;
};

module.exports = { refreshFedexAccessToken, getFedexShipmentInfoFromTrackingNum };
