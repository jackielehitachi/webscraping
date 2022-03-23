
const fetch = require('node-fetch');
require('dotenv').config();

const dhlTrackingEndpoint = "https://api-eu.dhl.com/track/shipments";

const getDHLShipmentInfoFromTrackingNum = async (trackingNumbers) => {
    const trackingNumbersArr = trackingNumbers.split(",");
    const url = `${dhlTrackingEndpoint}?trackingNumber=${trackingNumbers}&limit=100`
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            "accept": "*/*",
            "DHL-API-Key": process.env.DHL_PROD,
        }
    });
    let resJson = await res.json();
    resJson = resJson.shipments?.filter(e => trackingNumbersArr.includes(e.id)) || [];
    const result = resJson.map(e => {
        const status = e.status?.status;

        let deliveryDate = "Unknown";
        let shippingDate = "Unknown";
        if (status == "delivered") {
            deliveryDate = e.status.timestamp || deliveryDate;
        }
        if (e.events?.length > 0) {
            const shippedEvent = e.events[e.events.length - 1];
            shippingDate = shippedEvent.timestamp || shippingDate;
        }

        return {
            trackingNumber: e.id,
            status: e.status?.status || "Unknown",
            shippingDate,
            deliveryDate
        };
    });
    return result;
};

module.exports = { getDHLShipmentInfoFromTrackingNum };
