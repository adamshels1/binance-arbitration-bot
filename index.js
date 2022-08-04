const binance = require('node-binance-api')().options({
    APIKEY: '',
    APISECRET: '',
    useServerTime: true // If you get timestamp errors, synchronize to server time at startup
});
const fs = require('fs')
const path = require('path')

const data = fs.readFileSync(path.resolve(__dirname, 'data.txt'), 'utf8')
const dataArray = data.split('\n');
console.log('chains length:', dataArray.length)

// console.log(aaa[4].trim())
// return;

const getDateTime = () => {
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    return dateTime;
}

//BNB / DASH * BTC / BNB

// const a = 'BNB / DASH * BTC / BNB';
// const a = 'BNB / GTO * TUSD / BNB';
// const a = 'BNB / LTC * TUSD / BNB';
let TOTAL_AMOUNT = 0;
let SUCCESS_CHAIN_LENGTH = 0;

const run = (arguments) => {

binance.bookTickers((error, ticker) => {


    const calcChain = (symbols) => {
        // const symbols = 'BNB AION BTC BNB';
        const b = symbols.trim().split(' ');

        if(!Array.isArray(ticker)){
            return;
        }

        const chain_1m = ticker.find(i => i.symbol === b[0] + b[1]);
        const chain_1d = ticker.find(i => i.symbol === b[1] + b[0]);
        const chain_2m = ticker.find(i => i.symbol === b[1] + b[2]);
        const chain_2d = ticker.find(i => i.symbol === b[2] + b[1]);
        const chain_3m = ticker.find(i => i.symbol === b[2] + b[3]);
        const chain_3d = ticker.find(i => i.symbol === b[3] + b[2]);

        console.log('chain_1m', chain_1m)
        console.log('chain_1d', chain_1d)
        console.log('chain_2m', chain_2m)
        console.log('chain_2d', chain_2d)
        console.log('chain_3m', chain_3m)
        console.log('chain_3d', chain_3m)

        const AMOUNT = 10;

        if (!chain_1d) {
            // console.log('cant find chain_1d')
            return;
        }
        if (!chain_2m) {
            // console.log('cant find chain_2m')
            return;
        }
        if (!chain_3d) {
            // console.log('cant find chain_3d')
            return;
        }

        const res_1 = ('/') ? (AMOUNT / chain_1d.askPrice) : (AMOUNT * chain_1m.bidPrice);
        const res_2 = ('*') ? (res_1 * chain_2m.bidPrice) : (res_1 / chain_2d.askPrice);
        const res_3 = ('/') ? (res_2 / chain_3d.askPrice) : (res_2 * chain_3m.bidPrice);
        const COMISSION = (res_3 / 100) * (0.0750 * 3);
        const TOTAL_RESULT = res_3 - COMISSION;
        if (TOTAL_RESULT > AMOUNT) {
            TOTAL_AMOUNT = TOTAL_AMOUNT + (TOTAL_RESULT - AMOUNT);
            SUCCESS_CHAIN_LENGTH++;
            console.log(getDateTime());
            console.log(b);
            console.log('COMISSION', COMISSION);
            console.log("RESULT", TOTAL_RESULT);
            console.log('TOTAL_AMOUNT', TOTAL_AMOUNT);
            console.log('SUCCESS_CHAIN_LENGTH', SUCCESS_CHAIN_LENGTH);
            console.log("___________________________");
        }
    }

    dataArray.forEach(i => {
        calcChain(i);
    })

});

};


setInterval(run, 4000);