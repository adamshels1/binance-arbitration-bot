const Binance = require('binance-api-node').default

// Authenticated client, can make signed calls
const client = Binance({
    apiKey: '',
    apiSecret: '',
    getTime: Date.now() // time generator function, optional, defaults to () => Date.now()
});

const colors = require('colors');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const data = fs.readFileSync(path.resolve(__dirname, 'data/all_success_chains_4.txt'), 'utf8')
let dataArray = data.split('\n');
// dataArray = _.uniqWith(dataArray,_.isEqual); //get uniq chains
console.log('uniq chains length:', dataArray.length);

let usdCourses = fs.readFileSync(path.resolve(__dirname, 'usd_courses.json'), 'utf8');
usdCourses = JSON.parse(usdCourses);


const axios = require('axios');

const getDateTime = () => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
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
            amount: 1,
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
let BALANCE = 80;

const getStartAmount = (b) => {
    if (b.find(i => i === b[0]) === 'USDT' || b.find(i => i === b[1]) === 'PAX' || b.find(i => i === b[2]) === 'TUSD' || b.find(i => i === b[3]) === 'USDC') {
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

    let ticker = await client.allBookTickers();
    ticker = Object.values(ticker);

    // console.log('ticker', ticker)


    const calcEl = (symbols, amount = 0, check = true) => {

        // const symbols = 'BNB AION BTC BNB';
        const b = symbols.trim().split(' ');

        if (!Array.isArray(ticker)) {
            return;
        }
        const AMOUNT = amount;

        //d - деление
        //m - умножение
        const el_1m = ticker.find(i => i.symbol === b[0] + b[1]);
        const el_1d = ticker.find(i => i.symbol === b[1] + b[0]);
        const el_2m = ticker.find(i => i.symbol === b[1] + b[2]);
        const el_2d = ticker.find(i => i.symbol === b[2] + b[1]);
        const el_3m = ticker.find(i => i.symbol === b[2] + b[3]);
        const el_3d = ticker.find(i => i.symbol === b[3] + b[2]);
        const el_4m = ticker.find(i => i.symbol === b[3] + b[4]);
        const el_4d = ticker.find(i => i.symbol === b[4] + b[3]);

        console.log('el_1m', el_1m);
        console.log('el_1d', el_1d);
        console.log('el_2m', el_2m);
        console.log('el_2d', el_2d);
        console.log('el_3m', el_3m);
        console.log('el_3d', el_3d);
        console.log('el_4m', el_4m);
        console.log('el_4d', el_4d);
        return;
        let algoritm = '';

        const b_usd_1 = getCourseUSDFromFile(b[1]);
        if (!b_usd_1) {
            // console.log(`course ${b[0]} to usd not found`.red);
            return;
        }
        let res_1 = 0;
        let res_log_1 = '';
        let offer_amount_1 = 0;
        let offer_log_1 = '';
        let el_1 = null;
        let el_1_mark = '';
        if(el_1m){
            res_1 = AMOUNT * el_1m.bidPrice;
            res_log_1 = `${AMOUNT} * ${el_1m.bidPrice} = ${res_1}`;
            offer_amount_1 = el_1m.bidQty * b_usd_1.price;
            offer_log_1 = `${el_1m.bidQty} * ${b_usd_1.price} = ${offer_amount_1}`;
            algoritm = algoritm+' M';
            el_1 = el_1m;
            el_1_mark = 'M';
        }else if(el_1d){
            res_1 = AMOUNT / el_1d.askPrice;
            res_log_1 = `${AMOUNT} / ${el_1d.askPrice} = ${res_1}`;
            offer_amount_1 = el_1d.askQty * b_usd_1.price;
            offer_log_1 = `${el_1d.askQty} * ${b_usd_1.price} = ${offer_amount_1}`;
            algoritm = algoritm+' D';
            el_1 = el_1d;
            el_1_mark = 'D';
        }
        const OFFER_1 = {
            amount: offer_amount_1,
            symbol: b_usd_1.symbol
        };



        const b_usd_2 = getCourseUSDFromFile(b[1]);
        if (!b_usd_2) {
            // console.log(`course ${b[1]} to usd not found`.red);
            return;
        }
        let res_2 = 0;
        let res_log_2 = '';
        let offer_amount_2 = 0;
        let offer_log_2 = '';
        let el_2 = null;
        let el_2_mark = '';
        if(el_2m){
            res_2 = res_1 * el_2m.bidPrice;
            res_log_2 = `${res_1} * ${el_2m.bidPrice} = ${res_2}`;
            offer_amount_2 = el_2m.bidQty * b_usd_2.price;
            offer_log_2 = `${el_2m.bidQty} * ${b_usd_2.price} = ${offer_amount_2}`;
            algoritm = algoritm+' M';
            el_2 = el_2m;
            el_2_mark = 'M';
        }else if(el_2d){
            res_2 = res_1 / el_2d.askPrice;
            res_log_2 = `${res_1} / ${el_2d.askPrice} = ${res_2}`;
            offer_amount_2 = el_2d.askQty * b_usd_2.price;
            offer_log_2 = `${el_2d.askQty} * ${b_usd_2.price} = ${offer_amount_2}`;
            algoritm = algoritm+' D';
            el_2 = el_2d;
            el_2_mark = 'D';
        }
        const OFFER_2 = {
            amount: offer_amount_2,
            symbol: b_usd_2.symbol
        };



        const b_usd_3 = getCourseUSDFromFile(b[2]);
        if (!b_usd_3) {
            // console.log(`course ${b[1]} to usd not found`.red);
            return;
        }
        let res_3 = 0;
        let res_log_3 = '';
        let offer_amount_3 = 0;
        let offer_log_3 = '';
        let el_3 = null;
        let el_3_mark = '';
        if(el_3m){
            res_3 = res_2 * el_3m.bidPrice;
            res_log_3 = `${res_2} * ${el_3m.bidPrice} = ${res_3}`;
            offer_amount_3 = el_3m.bidQty * b_usd_3.price;
            offer_log_3 = `${el_3m.bidQty} * ${b_usd_2.price} = ${offer_amount_3}`;
            algoritm = algoritm+' M';
            el_3 = el_3m;
            el_3_mark = 'M';
        }else if(el_3d){
            res_3 = res_2 / el_3d.askPrice;
            res_log_3 = `${res_2} / ${el_3d.askPrice} = ${res_3}`;
            offer_amount_3 = el_3d.askQty * b_usd_3.price;
            offer_log_3 = `${el_3d.askQty} * ${b_usd_3.price} = ${offer_amount_3}`;
            algoritm = algoritm+' D';
            el_3 = el_3d;
            el_3_mark = 'D';
        }
        const OFFER_3 = {
            amount: offer_amount_3,
            symbol: b_usd_3.symbol
        };

        // console.log(b)
        if(algoritm.length !== 6){
            console.log(`BAD SHAIN: ${b}`.red)
            return;
        }


        const MINIMAL_OFFER = getMinimalAmount(OFFER_1, OFFER_2, OFFER_3);

        let MINIMAL_OFFER_AMOUNT = 0;
        const START_AMOUNT = getStartAmount(b);
        // console.log('START_AMOUNT', START_AMOUNT)
        if (MINIMAL_OFFER.amount > BALANCE && BALANCE > START_AMOUNT) {
            MINIMAL_OFFER_AMOUNT = BALANCE;
        } else if (BALANCE > MINIMAL_OFFER.amount && MINIMAL_OFFER.amount > START_AMOUNT) {
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
        if (PROFIT > 0) {


            TOTAL_AMOUNT = TOTAL_AMOUNT + (FINAL - AMOUNT);
            if (!check) {

                const PROFIT_USD = PROFIT * b_usd_0.price;

                if (PROFIT > 0) {


                    console.log(getDateTime());
                    console.log('BALANCE', BALANCE);
                    console.log(b);
                    console.log('el_1_'+el_1_mark, el_1);
                    console.log('el_1_'+el_1_mark, el_1.symbol);
                    console.log(`OFFER_1 ${b_usd_1.symbol} : `, offer_log_1);
                    console.log('el_2_'+el_2_mark, el_2);
                    console.log('el_2_'+el_2_mark, el_2.symbol);
                    console.log(`OFFER_2 ${b_usd_2.symbol} : `, offer_log_2);
                    console.log('el_3_'+el_3_mark, el_3);
                    console.log('el_3_'+el_3_mark, el_3.symbol);
                    console.log(`OFFER_3 ${b_usd_3.symbol} : `, offer_log_3);
                    console.log(OFFER_1);
                    console.log(OFFER_2);
                    console.log(OFFER_3);
                    console.log('MINIMAL_OFFER_CHOOSE:', MINIMAL_OFFER.amount);
                    console.log('MINIMAL_OFFER:', MINIMAL_OFFER_AMOUNT);
                    console.log(`FINAL_OFFER ${b[0]}:`, `${MINIMAL_OFFER_AMOUNT} * 0.9 / ${b_usd_0.price}`);
                    console.log(`MINIMAL_OFFER ${b[0]} = `, CHECK_RESULT.toString().red);
                    console.log('----------------------------------');
                    if (!check) console.log(res_log_1);
                    if (!check) console.log(res_log_2);
                    if (!check) console.log(res_log_3);
                    console.log('----------------------------------');
                    console.log(`COMISSION ${b[0]}`, `(${res_3} / 100) * (0.0750 * 3) = ${COMISSION}`);
                    console.log(`FINAL ${b[0]}: `, `${res_3} - ${COMISSION} = ${FINAL}`);
                    console.log(`PROFIT ${b[0]}:`, `${FINAL} - ${CHECK_RESULT} = ${PROFIT} (${PROFIT_USD.toString().red} USD)`);
                    console.log('PROFIT %: ', ((FINAL * 100) / CHECK_RESULT - 100).toString().red);


                    BALANCE = BALANCE + PROFIT;
                    console.log('SUCCESS_EL_LENGTH', SUCCESS_EL_LENGTH);
                    SUCCESS_EL_LENGTH++;
                    console.log("___________________________");
                    console.log("\n");
                }

            }
        }
    };

    dataArray.forEach(i => {
        const res = calcEl(i, 1);
        if (res) {
            // console.log(res)
            calcEl(i, res, false)
        }
    });

}

run();

// setInterval(() => {
//     run();
// }, 2000);
