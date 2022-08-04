const Binance = require('binance-api-node').default

// Authenticated client, can make signed calls
const client = Binance({
    apiKey: '',
    apiSecret: '',
    // getTime: Date.now() // time generator function, optional, defaults to () => Date.now()
});

const colors = require('colors');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const data = fs.readFileSync(path.resolve(__dirname, 'data_d_m_m.txt'), 'utf8')
let dataArray = data.split('\n');
dataArray = _.uniqWith(dataArray,_.isEqual); //get uniq chains
console.log('uniq chains length:', dataArray.length);

let rules = fs.readFileSync(path.resolve(__dirname, 'trade_rules.txt'), 'utf8')
rules = rules.split('\n');
rules = rules.map(i=>{
    return i.trim().split(' ');
});

const getRules = (symbol, amount, rule = 1) =>{
    const f = x => ~(x + '').indexOf('.') ? (x + '').split('.')[1].length : 0;
    if(f(amount) === 0){
        return amount;
    }
    const r = rules.find(i=>i[0]===symbol);
    let a = amount.toString().split('.');
    const l = (rule === 1) ? f(r[1]) : f(r[3]);

    if(l === 0){
        return parseInt(a[0]);
    }else{
        if(a[1].length > l){
            return parseFloat(a[0].toString()+'.'+a[1].toString().slice(0,l));
        }else{
            return amount;
        }
    }
};
// console.log(getRules('TFUELBNB', 22000.123456789, 2));
// return;

let usdCourses = fs.readFileSync(path.resolve(__dirname, 'usd_courses.json'), 'utf8');
usdCourses = JSON.parse(usdCourses);


const axios = require('axios');

const getDateTime = () => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds() + ":" + today.getMilliseconds();
    const dateTime = date + ' ' + time;
    return dateTime;
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}


async function getCourseUSD(course) {
    if (!course) return;
    try {
        const response = await axios.get(`https://api.cryptonator.com/api/ticker/${course}-usd`);
        // console.log(response.data);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

function getCourseUSDFromFile(course) {
    const res = usdCourses.find(c => c.symbol === course);
    if (res) {
        return res;
    }
    if (course === 'USDT' || course === 'TUSD' || course === 'PAX' || course === 'USDC') {
        return {
            price: 1,
            symbol: course
        }
    }
    return null;
}

async function getCoursesUSD() {

    const unique = dataArray.join(' ').split(' ').filter((v, i, a) => a.indexOf(v) === i);
    console.log(unique.length)

    let courses = [];
    console.log(getDateTime());


    await asyncForEach(unique, async (i) => {
        console.log(i)
        const course = await getCourseUSD(i);
        // console.log(course.ticker.price)
        if (course && course.ticker) {
            courses.push({symbol: course.ticker.base, price: course.ticker.price})
        }
    })
    console.log(courses)
    await fs.writeFileSync("usd_courses.json", JSON.stringify(courses));
    console.log(getDateTime());

}

// getCoursesUSD();

const START_AMOUNT_FOR_UST = 3; //USD
const START_AMOUNT_OLD = 10.5; //USDT, PAX, TUSD, USDC любая цепочка которое содержит эти валюты
let TOTAL_AMOUNT = 0;
let SUCCESS_EL_LENGTH = 0;
let EARN_USD = 0;

const getStartAmount = (b) => {
    if (b.find(i=>i===b[0]) === 'USDT' || b.find(i=>i===b[1]) === 'PAX' || b.find(i=>i===b[2]) === 'TUSD' || b.find(i=>i===b[3]) === 'USDC') {
        return START_AMOUNT_OLD;
    } else {
        return START_AMOUNT_FOR_UST;
    }
};

const getMinimalAmount = (a, b, c) => {
    let MINIMAL_OFFER = 0;
    if (a.amount < b.amount && a.amount < c.amount) {
        MINIMAL_OFFER = a;
    } else if (b.amount < a.amount && b.amount < c.amount) {
        MINIMAL_OFFER = b;
    } else if (c.amount < a.amount && c.amount < b.amount) {
        MINIMAL_OFFER = c;
    }
    return MINIMAL_OFFER;
};

async function run() {
    // await getCourse('btc');
    // await getCourse('bnb');
    // await getCourse('ren');
    //all symbols
    // console.log(await client.allBookTickers())

    let tickers = await client.allBookTickers();
    tickers = Object.values(tickers);
    let account = await client.accountInfo();
    let {balances = []} = account;
    balances  = balances.filter(i=>i.free !== '0.00000000');

    // console.log('tickers', tickers)


    async function calcEl(symbols, amount = 0, check = true){

        // const symbols = 'BNB AION BTC BNB';
        const b = symbols.trim().split(' ');

        if (!Array.isArray(tickers)) {
            return;
        }

        // let balances = [
        //     { asset: 'BTC', free: '0.3', locked: '0.00000000' },
        //     { asset: 'BNB', free: '137', locked: '0.00000000' },
        //     { asset: 'ETH', free: '17', locked: '0.00000000' },
        //     { asset: 'USDT', free: '3000', locked: '0.00000000' },
        //     { asset: 'PAX', free: '3000', locked: '0.00000000' },
        //     { asset: 'TUSD', free: '3000', locked: '0.00000000' },
        //     { asset: 'USDC', free: '3000', locked: '0.00000000' },
        // ];

        let BALANCE = balances.find(i=> i.asset===b[0]);
        if(!BALANCE){
            // console.log('NOT AVAILABLE BALANCE FOR '+b[0].red)
            return;
        }

        const b_usd = getCourseUSDFromFile(b[0]);
        let BALANCE_USD = b_usd.price * BALANCE.free;
        // if(BALANCE.asset === 'BNB'){
        //     BALANCE_USD = 20;
        // }


        //d - деление
        //m - умножение
        const el_1m = tickers.find(i => i.symbol === b[0] + b[1]);
        const el_1d = tickers.find(i => i.symbol === b[1] + b[0]);
        const el_2m = tickers.find(i => i.symbol === b[1] + b[2]);
        const el_2d = tickers.find(i => i.symbol === b[2] + b[1]);
        const el_3m = tickers.find(i => i.symbol === b[2] + b[3]);
        const el_3d = tickers.find(i => i.symbol === b[3] + b[2]);

        // console.log('el_1m', el_1m)
        // console.log('el_1d', el_1d)
        // console.log('el_2m', el_2m)
        // console.log('el_2d', el_2d)
        // console.log('el_3m', el_3m)
        // console.log('el_3d', el_3d)

        //bidPrice - цена по которой хотят купить прямо сейчас -- SELL
        //bidQty - Объем который хотят купить по bidPrice -- SELL
        //askPrice - цена по которой хотят продать прямо сейчас -- BUY
        //askQty - объем который хотят продать по askPrice -- BUY
        //
        if (!el_1d) {
            // console.log('cant find el_1d')
            return;
        }
        if (!el_2m) {
            // console.log('cant find el_2m')
            return;
        }
        if (!el_3m) {
            // console.log('cant find el_3d')
            return;
        }
        // const AMOUNT = getRules(el_1d.symbol, amount, 2);
        const AMOUNT = amount;

        let res_1 = ('/') ? (AMOUNT / el_1d.askPrice) : (AMOUNT * el_1m.bidPrice);
        res_1 = getRules(el_2m.symbol, res_1);
        const b_usd_1 = getCourseUSDFromFile(b[1]);
        if (!b_usd_1) {
            // console.log(`course ${b[0]} to usd not found`.red);
            return;
        }
        let rest_1_usd = ((AMOUNT / el_1d.askPrice) - res_1) * b_usd_1.price;
        const OFFER_1 = {
            amount: el_1d.askQty * b_usd_1.price,
            symbol: b_usd_1.symbol
        };



        let res_2 = ('*') ? (res_1 * el_2m.bidPrice) : (res_1 / el_2d.askPrice);
        res_2 = getRules(el_2m.symbol, res_2);

        const b_usd_2 = getCourseUSDFromFile(b[1]);
        if (!b_usd_2) {
            // console.log(`course ${b[1]} to usd not found`.red);
            return;
        }
        const OFFER_2 = {
            amount: el_2m.bidQty * b_usd_2.price,
            symbol: b_usd_2.symbol
        };



        let res_3 = ('*') ? (res_2 * el_3m.bidPrice) : (res_2 / el_3d.askPrice);
        // res_3 = getRules(el_3m.symbol, res_3);

        const b_usd_3 = getCourseUSDFromFile(b[2]);
        let rest_2_usd = ((res_1 * el_2m.bidPrice) - res_2) * b_usd_3.price;
        if (!b_usd_3) {
            // console.log(`course ${b[2]} to usd not found`.red);
            return;
        }
        const OFFER_3 = {
            amount: el_3m.bidQty * b_usd_3.price,
            symbol: b_usd_3.symbol
        };

        const MINIMAL_OFFER = getMinimalAmount(OFFER_1, OFFER_2, OFFER_3);

        let MINIMAL_OFFER_AMOUNT = 0;
        const START_AMOUNT = getStartAmount(b);
        // console.log('START_AMOUNT', START_AMOUNT)
        if (MINIMAL_OFFER.amount > BALANCE_USD && BALANCE_USD > START_AMOUNT) {
            MINIMAL_OFFER_AMOUNT = BALANCE_USD;
        } else if (BALANCE_USD > MINIMAL_OFFER.amount && MINIMAL_OFFER.amount > START_AMOUNT) {
            MINIMAL_OFFER_AMOUNT = MINIMAL_OFFER.amount;
        }
        if (!MINIMAL_OFFER_AMOUNT) {
            // console.log('BAD MINIMAL_OFFER_AMOUNT'.toString().yellow);
            return;
        }

        const MINIMAL_OFFER_USD = getCourseUSDFromFile(MINIMAL_OFFER.symbol);

        const b_usd_0 = getCourseUSDFromFile(b[0]);
        // console.log('b_usd_0', b[0], b_usd_0)
        const CHECK_RESULT = (MINIMAL_OFFER_AMOUNT * 0.9) / b_usd_0.price;

        if (check) {
            return CHECK_RESULT;
        }
        const COMISSION = (res_3 / 100) * (0.0750 * 3);
        const FINAL = res_3 - COMISSION;
        const PROFIT = FINAL - CHECK_RESULT;
        if (PROFIT >= 0) {




            TOTAL_AMOUNT = TOTAL_AMOUNT + (FINAL - AMOUNT);
            if (!check) {

                const PROFIT_USD = PROFIT * b_usd_0.price;

                if (PROFIT >= 0) {
                    console.log(getDateTime());
                    //m - SELL
                    //d - BUY
                    console.log('order_1',{
                        symbol: el_1d.symbol,
                        side: 'BUY',
                        quantity: getRules(el_2m.symbol, res_1),
                        price: el_1d.askPrice,
                    });
                    // const order_1 = await client.order({
                    //     symbol: el_1d.symbol,
                    //     side: 'BUY',
                    //     quantity: res_1,
                    //     price: el_1d.askPrice,
                    // });
                    console.log(getDateTime());
                    // console.log('order_1_res', order_1);


                    console.log('order_2',{
                        symbol: el_2m.symbol,
                        side: 'SELL',
                        quantity: getRules(el_2m.symbol, res_1),
                        price: el_2m.bidPrice,
                    });
                    // const order_2 = await client.order({
                    //     symbol: el_2m.symbol,
                    //     side: 'SELL',
                    //     quantity: res_2,
                    //     price: el_2m.bidPrice,
                    // });
                    console.log(getDateTime());
                    // console.log('order_2_res', order_2);


                    console.log('order_3',{
                        symbol: el_3m.symbol,
                        side: 'SELL',
                        quantity: getRules(el_2m.symbol, res_2),
                        price: el_3m.bidPrice,
                    });
                    // const order_3 = await client.order({
                    //     symbol: el_3m.symbol,
                    //     side: 'SELL',
                    //     quantity: res_3,
                    //     price: el_3m.bidPrice,
                    // });
                    console.log(getDateTime());
                    // console.log('order_3_res', order_3);

                    console.log('BALANCE_USD', BALANCE_USD);
                    console.log(b);
                    console.log('el_1d', el_1d);
                    console.log('el_1d', el_1d.symbol);
                    console.log(`OFFER_1 ${b_usd_1.symbol} : `, `${el_1d.askQty} * ${b_usd_1.price} = ${el_1d.askQty * b_usd_1.price}`);
                    console.log('el_2m', el_2m);
                    console.log('el_2m', el_2m.symbol);
                    console.log(`OFFER_2 ${b_usd_2.symbol} : `, `${el_2m.bidQty} * ${b_usd_2.price} = ${el_2m.bidQty * b_usd_2.price}`);
                    console.log('el_3m', el_3m);
                    console.log('el_3m', el_3m.symbol);
                    console.log(`OFFER_3 ${b_usd_3.symbol} : `, `${el_3m.bidQty} * ${b_usd_3.price} = ${el_3m.bidQty * b_usd_3.price}`);
                    console.log(OFFER_1);
                    console.log(OFFER_2);
                    console.log(OFFER_3);
                    console.log('MINIMAL_OFFER_CHOOSE:', MINIMAL_OFFER.amount);
                    console.log('MINIMAL_OFFER:', MINIMAL_OFFER_AMOUNT);
                    console.log(`FINAL_OFFER ${b[0]}:`, `${MINIMAL_OFFER_AMOUNT} * 0.9 / ${b_usd_0.price}`);
                    console.log(`MINIMAL_OFFER ${b[0]} = `, CHECK_RESULT.toString().red);
                    console.log('----------------------------------');
                    if (!check) console.log(`${AMOUNT} / ${el_1d.askPrice} = ${AMOUNT / el_1d.askPrice}`);
                    if (!check) console.log(`${res_1} * ${el_2m.bidPrice} = ${res_1 * el_2m.bidPrice}`);
                    if (!check) console.log(`${res_2} * ${el_3m.bidPrice} = ${res_2 * el_3m.bidPrice}`);
                    console.log('----------------------------------');
                    console.log(`COMISSION ${b[0]}`, `(${res_3} / 100) * (0.0750 * 3) = ${COMISSION}`);
                    console.log(`FINAL ${b[0]}: `, `${res_3} - ${COMISSION} = ${FINAL}`);
                    const PROFIT_USD_WITH_REST = PROFIT_USD + (rest_1_usd+rest_2_usd);
                    console.log(`PROFIT ${b[0]}:`, `${FINAL} - ${CHECK_RESULT} = ${PROFIT} (${PROFIT_USD.toString().red} + ${rest_1_usd+rest_2_usd} = ${PROFIT_USD_WITH_REST.toString().white} USD)`);
                    console.log('PROFIT %: ', ((FINAL * 100) / CHECK_RESULT - 100).toString().red);


                    EARN_USD = EARN_USD + PROFIT_USD;
                    console.log('EARN_USD', EARN_USD);
                    console.log('SUCCESS_EL_LENGTH', SUCCESS_EL_LENGTH);
                    SUCCESS_EL_LENGTH++;
                    console.log("___________________________");
                    console.log("\n");
                }

            }
        }
    };

    await asyncForEach(dataArray, async (i) => {
        const res = await calcEl(i, 1);
        await calcEl(i, res, false);
    });


}

// run();

setInterval(() => {
    run();
}, 2000);
