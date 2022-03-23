const fedex = require('./fedex');
const dhl = require('./dhl');

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '../dist');
const HTML_FILE = path.join(DIST_DIR, 'index.html');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(DIST_DIR));

app.post('/fedex', async (req, res) => {
    try {
        const trackingNumString = req.body.trackingNumString.replaceAll(/\s/g, '');
        const trackingNumArr = trackingNumString.split(',');
        const result = await fedex.getFedexShipmentInfoFromTrackingNum(trackingNumArr);
        res.send({ success: !!result?.length, result });
    } catch (e) {
        res.send(e);
    }
});

app.post('/dhl', async (req, res) => {
    try {
        const trackingNumString = req.body.trackingNumString.replaceAll(/\s/g, '');
        const result = await dhl.getDHLShipmentInfoFromTrackingNum(trackingNumString);
        res.send({ success: !!result?.length, result });
    } catch (e) {
        res.send(e);
    }
});

app.get('/', (req, res) => {
    res.sendFile(HTML_FILE);
});

app.listen(port, function () {
    console.log('App listening on port: ' + port);
});
