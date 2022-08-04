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

const data = fs.readFileSync(path.resolve(__dirname, 'data_d_m_m.txt'), 'utf8');
let dataArray = data.split('\n');
dataArray = _.uniqWith(dataArray,_.isEqual); //get uniq chains
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

async function saveCoursesUSDtoFile() {

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

saveCoursesUSDtoFile();

setInterval(() => {
    saveCoursesUSDtoFile();
}, 1000 * 60 * 10);