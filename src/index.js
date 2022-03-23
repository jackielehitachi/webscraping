import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import fetch from 'node-fetch'

const Index = () => {
    const [inputs, setInputs] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const maxTrackingNumsPerFedexReq = 30;
    const maxTrackingNumsPerDHLReq = 3;

    const convertDateToString = date => {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }

    const callAPI = async (apiCall, reqBody) => {
        const res = await fetch(apiCall, {
            method: 'POST',
            body: JSON.stringify({ trackingNumString: reqBody }),
            headers: { 'Content-Type': 'application/json', 'Accept': '*/*' }
        });
        let resJson = await res.json();
        let downloadData = "";
        if (resJson.success) {
            resJson.result.forEach(e => {
                const shippingDate = new Date(e.shippingDate);
                const deliveryDate = new Date(e.deliveryDate);
                downloadData += `${convertDateToString(shippingDate)},${convertDateToString(deliveryDate)},${e.trackingNumber},${e.status}\n`;
            });
        }
        return downloadData;
    }

    const handleFedexCalls = async (trackingNumArr) => {
        let downloadData = "";
        for (let i = 0; i < trackingNumArr.length; i += maxTrackingNumsPerFedexReq) {
            const lastIndex = (i + maxTrackingNumsPerFedexReq) > trackingNumArr.length ? trackingNumArr.length : (i + maxTrackingNumsPerFedexReq);
            let dataForCurrReq = trackingNumArr.slice(i, lastIndex).join(",");
            downloadData += await callAPI("/fedex", dataForCurrReq);
        }
        return downloadData;
    }

    const handleDHLCalls = async (trackingNumArr) => {
        let downloadData = "";
        for (let i = 0; i < trackingNumArr.length; i += maxTrackingNumsPerDHLReq) {
            const lastIndex = (i + maxTrackingNumsPerDHLReq) > trackingNumArr.length ? trackingNumArr.length : (i + maxTrackingNumsPerDHLReq);
            let dataForCurrReq = trackingNumArr.slice(i, lastIndex).join(",");
            downloadData += await callAPI("/dhl", dataForCurrReq);
            await new Promise(r => setTimeout(r, 1000));
        }
        return downloadData;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        let downloadData = "Shipping Date,Delivered Date,Tracking #,Status\n";
        const trackingNumArr = inputs.trackingNums.replaceAll(/\s/g, '').split(',');
        switch (inputs.apiType) {
            case "fedex":
                downloadData += await handleFedexCalls(trackingNumArr);
                break;
            case "DHL":
                downloadData += await handleDHLCalls(trackingNumArr);
                break;
            default:
                downloadData += await handleFedexCalls(trackingNumArr);
        }
        download(downloadData);
        setIsLoading(false);
    }

    const download = (downloadData) => {
        const data = `data:,${encodeURIComponent(downloadData)}`;
        const filename = `ShippingData.csv`;
        const aTag = document.createElement('a');

        aTag.href = data;
        aTag.download = filename;
        aTag.click();
    }

    const handleChange = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setInputs(values => ({ ...values, [name]: value }));
    }

    return (
        <form style={{ display: 'flex', flexDirection: 'column' }} onSubmit={handleSubmit}>
            <label>Enter the tracking numbers separated by commas:</label>
            <textarea name="trackingNums" value={inputs.trackingNums || ""} onChange={handleChange} style={{ width: '40%', height: '200px' }} />
            <select name="apiType" value={inputs.apiType} onChange={handleChange} style={{ marginRight: 'auto', marginTop: '10px' }}>
                <option value="fedex">Fedex</option>
                <option value="DHL">DHL</option>
            </select>
            <input type="submit"
                style={{ marginRight: 'auto', marginTop: '10px' }}
                value={isLoading ? "Downloading..." : "Submit"}
                disabled={isLoading} />
        </form>
    )
};

ReactDOM.render(<Index />, document.getElementById('app'))