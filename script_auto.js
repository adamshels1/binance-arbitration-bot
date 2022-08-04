const Binance = require('binance-api-node').default

// Authenticated client, can make signed calls
const client = Binance({
    apiKey: '',
    apiSecret: '',
});

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { Telegraf } = require('telegraf');
const bot = new Telegraf('1148691475:AAFKB-WXtGzOZkF28VDtKfTTlEcecYrGoyE');
const colors = require('colors');

const data = fs.readFileSync(path.resolve(__dirname, 'data_auto.txt'), 'utf8')
let dataArray = data.split('\n');
dataArray = _.uniqWith(dataArray, _.isEqual); //get uniq chains

// dataArray = ['USDT BTC ETH USDT']; //эта строка только для теста, удалить ее для прода
// dataArray = ['USDT WIN TRX USDT']; //эта строка только для теста, удалить ее для прода
// dataArray = ['USDT BTC USDC USDT']; //эта строка только для теста, удалить ее для прода
// dataArray = ['USDT BTC USDC USDT', 'USDT BTC TRX USDT']; //эта строка только для теста, удалить ее для прода


console.log('uniq chains length:', dataArray.length);


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

//ожидает: amount- сумма, symbol - пара символов, exchangeInfo запрос с binance
//отдает: сумму с обрезаным концом по правилам https://www.binance.com/en/trade-rule
const toFixedMinAmountSymbolRules = (amount, symbol, exchangeInfo) => {
    if (amount === Infinity) {
        console.log(`amount Infinity ${symbol}`.red);
        return;
    }
    if (isNaN(amount)) {
        console.log(`amount NaN ${symbol}`.red);
        return;
    }
    if (Number.isInteger(amount)) {
        return amount;
    }

    const symbolInfo = exchangeInfo.symbols.find(i => i.symbol === symbol);
    const symbolRules = symbolInfo.filters.find(i => i.filterType === 'LOT_SIZE');
    if (!symbolRules) {
        console.log(`not fount rules for symbol: ${symbol}`.red)
        return;
    }
    // console.log('rules', symbolRules.stepSize); //'0.00001000'
    let ruleSplitted = parseFloat(symbolRules.stepSize).toString().split('.');
    const numbersAfterDot = ruleSplitted.length > 1 ? ruleSplitted[1].length : 0;

    let amountSplitted = amount.toString().split('.');
    const res = Number(amountSplitted[0] + '.' + amountSplitted[1].substr(0, numbersAfterDot));
    return res;
}


//отнимает комиссию с суммы https://www.binance.com/ru/fee/schedule
const minusTransactionComission = (amount) => {
    return (amount - (amount / 100 * 0.1));
}

async function run(exchangeInfo) {
    try {
        let tickers = await client.allBookTickers();
        tickers = Object.values(tickers);

        // console.log('tickers', tickers)


        const calcEl = async (symbols, amount = 0, check = true) => {

            // const symbols = 'USDT BTC ETH USDT';
            const b = symbols.trim().split(' ');
            //получаем символы в масссив [ 'USDT', 'BTC', 'ETH', 'USDT' ]

            if (!Array.isArray(tickers)) {
                return;
            }
            // const AMOUNT = amount;
            let AMOUNT = 0;
            const START_AMOUNT_USDT = 500;
            if (b[0] === 'USDT' || b[0] === 'USDS') {
                AMOUNT = START_AMOUNT_USDT;
            } else {
                const start_ticker = tickers.find(i => i.symbol === `${b[0]}USDT`);
                if (!parseFloat(start_ticker?.bidPrice)) return;
                AMOUNT = START_AMOUNT_USDT / start_ticker.bidPrice;
                AMOUNT = toFixedMinAmountSymbolRules(AMOUNT, `${b[0]}USDT`, exchangeInfo);
                return;
            }


            //d - деление
            //m - умножение
            const el_1m = tickers.find(i => i.symbol === b[0] + b[1]);
            if (el_1m && !parseFloat(el_1m.bidPrice)) return;
            const el_1d = tickers.find(i => i.symbol === b[1] + b[0]);
            if (el_1d && !parseFloat(el_1d.bidPrice)) return;

            const el_2m = tickers.find(i => i.symbol === b[1] + b[2]);
            if (el_2m && !parseFloat(el_2m.bidPrice)) return;
            const el_2d = tickers.find(i => i.symbol === b[2] + b[1]);
            if (el_2d && !parseFloat(el_2d.bidPrice)) return;

            const el_3m = tickers.find(i => i.symbol === b[2] + b[3]);
            if (el_3m && !parseFloat(el_3m.bidPrice)) return;
            const el_3d = tickers.find(i => i.symbol === b[3] + b[2]);
            if (el_3d && !parseFloat(el_3d.bidPrice)) return;
            //получаем:
            // el_2m {
            //     symbol: 'BTCUSDT',
            //     bidPrice: '48272.79000000',
            //     bidQty: '0.00001000',
            //     askPrice: '48272.80000000',
            //     askQty: '3.86109000'
            //   }

            //askPrice - то что продают, мы можем купить
            //bidPrice - это то что готовы купить, мы продаем


            // console.log('el_1m', el_1m);
            // console.log('el_1d', el_1d);
            // console.log('el_2m', el_2m);
            // console.log('el_2d', el_2d);
            // console.log('el_3m', el_3m);
            // console.log('el_3d', el_3d);

            let algoritm = '';
            let res_1 = 0;
            let res_1_with_commision = 0;
            let res_log_1 = '';
            let first_transition_amount = 0;
            let first_transition_amount_log = '';
            if (el_1m) {
                res_1 = AMOUNT * el_1m.bidPrice;
                res_log_1 = `${el_1m.symbol} res_1: ${res_1} = ${AMOUNT} * ${el_1m.bidPrice}`;
                res_1 = toFixedMinAmountSymbolRules(res_1, el_1m.symbol, exchangeInfo);
                res_log_1 = `${res_log_1} -> toFixedMinAmountSymbolRules(${res_1}) -> ${res_1}\n`


                res_1_with_commision = minusTransactionComission(res_1);
                res_log_1 = `${res_log_1}res_1_with_commision: minusTransactionComission(${res_1}) -> toFixedMinAmountSymbolRules(${res_1_with_commision}) ->`;
                res_1_with_commision = toFixedMinAmountSymbolRules(res_1_with_commision, el_1m.symbol, exchangeInfo);
                res_log_1 = `${res_log_1} ${res_1_with_commision}`;

                algoritm = algoritm + ' M';

            } else if (el_1d) {
                res_1 = AMOUNT / el_1d.askPrice;
                res_log_1 = `${el_1d.symbol} res_1: ${res_1} = ${AMOUNT} / ${el_1d.askPrice}`;
                res_1 = toFixedMinAmountSymbolRules(res_1, el_1d.symbol, exchangeInfo);
                first_transition_amount = res_1 * el_1d.askPrice;
                first_transition_amount_log = `${first_transition_amount} = ${res_1} * ${el_1d.askPrice}`;
                res_log_1 = `${res_log_1} -> toFixedMinAmountSymbolRules(${res_1}) -> ${res_1}\n`

                if (res_1 > el_1d.askQty) {
                    // console.log(`Not yeat ${el_1d.symbol} askQty:${el_1d.askQty}, need ${res_1}`.red);
                    return;
                }

                res_1_with_commision = minusTransactionComission(res_1);
                res_log_1 = `${res_log_1}res_1_with_commision: minusTransactionComission(${res_1}) -> toFixedMinAmountSymbolRules(${res_1_with_commision}) ->`;
                res_1_with_commision = toFixedMinAmountSymbolRules(res_1_with_commision, el_1d.symbol, exchangeInfo);
                res_log_1 = `${res_log_1} ${res_1_with_commision}`;

                algoritm = algoritm + ' D';
            }



            let res_2 = 0;
            let res_2_with_commision = 0;
            let res_log_2 = '';
            if (el_2m) {
                res_2 = res_1_with_commision * el_2m.bidPrice;
                res_log_2 = `${el_2m.symbol} res_2: ${res_2} = ${res_1_with_commision} * ${el_2m.bidPrice}`;
                res_2 = toFixedMinAmountSymbolRules(res_2, el_2m.symbol, exchangeInfo);
                res_log_2 = `${res_log_2} -> toFixedMinAmountSymbolRules(${res_2}) -> ${res_2}\n`

                res_2_with_commision = minusTransactionComission(res_2);
                res_log_2 = `${res_log_2}res_2_with_commision: minusTransactionComission(${res_2}) -> toFixedMinAmountSymbolRules(${res_2_with_commision}) ->`;
                res_2_with_commision = toFixedMinAmountSymbolRules(res_2_with_commision, el_2m.symbol, exchangeInfo);
                res_log_2 = `${res_log_2} ${res_2_with_commision}`;
                algoritm = algoritm + ' M';

            } else if (el_2d) {
                res_2 = res_1_with_commision / el_2d.askPrice;
                res_log_2 = `${el_2d.symbol} res_2: ${res_2} = ${res_1_with_commision} / ${el_2d.askPrice}`;
                res_2 = toFixedMinAmountSymbolRules(res_2, el_2d.symbol, exchangeInfo);
                res_log_2 = `${res_log_2} -> toFixedMinAmountSymbolRules(${res_2}) -> ${res_2}\n`

                if (res_2 > el_2d.askQty) {
                    // console.log(`Not yeat ${el_2d.symbol} askQty:${el_2d.askQty}, need ${res_2}`.red);
                    return;
                }

                res_2_with_commision = minusTransactionComission(res_2);
                res_log_2 = `${res_log_2}res_2_with_commision: minusTransactionComission(${res_2}) -> toFixedMinAmountSymbolRules(${res_2_with_commision}) ->`;
                res_2_with_commision = toFixedMinAmountSymbolRules(res_2_with_commision, el_2d.symbol, exchangeInfo);
                res_log_2 = `${res_log_2} ${res_2_with_commision}`;
                algoritm = algoritm + ' D';
            }



            let res_3 = 0;
            let res_3_with_commision = 0;
            let res_log_3 = '';
            let res_2_toFixed_next = 0;
            if (el_3m) {
                res_2_toFixed_next = toFixedMinAmountSymbolRules(res_2_with_commision, el_3m.symbol, exchangeInfo);
                res_3 = res_2_toFixed_next * el_3m.bidPrice;
                res_log_3 = `${el_3m.symbol} res_3: ${res_3} = ${res_2_toFixed_next}(with fixded) * ${el_3m.bidPrice}`;
                res_3 = toFixedMinAmountSymbolRules(res_3, el_3m.symbol, exchangeInfo);
                res_log_3 = `${res_log_3} -> toFixedMinAmountSymbolRules(${res_3}) -> ${res_3}\n`

                if (res_2_toFixed_next > el_3m.bidQty) {
                    //console.log(`Not yeat ${el_3m.symbol} askQty:${el_3m.bidQty}, need ${res_2_toFixed_next}`.red);
                    return;
                }

                res_3_with_commision = minusTransactionComission(res_3);
                res_log_3 = `${res_log_3}res_3_with_commision: minusTransactionComission(${res_3}) -> toFixedMinAmountSymbolRules(${res_3_with_commision}) ->`;
                res_3_with_commision = toFixedMinAmountSymbolRules(res_3_with_commision, el_3m.symbol, exchangeInfo);
                res_log_3 = `${res_log_3} ${res_3_with_commision}`;
                algoritm = algoritm + ' M';
            } else if (el_3d) {
                res_3 = res_2_with_commision / el_3d.askPrice;
                res_log_3 = `${el_3d.symbol} res_3: ${res_3} = ${res_2_with_commision} / ${el_3d.askPrice}`;
                res_3 = toFixedMinAmountSymbolRules(res_3, el_3d.symbol, exchangeInfo);
                res_log_3 = `${res_log_3} -> toFixedMinAmountSymbolRules(${res_3}) -> ${res_3}\n`

                res_3_with_commision = minusTransactionComission(res_3);
                res_log_3 = `${res_log_3}res_3_with_commision: minusTransactionComission(${res_3}) -> toFixedMinAmountSymbolRules(${res_3_with_commision}) ->`;
                res_3_with_commision = toFixedMinAmountSymbolRules(res_3_with_commision, el_3d.symbol, exchangeInfo);
                res_log_3 = `${res_log_3} ${res_3_with_commision}`;
                algoritm = algoritm + ' D';
            }


            if (algoritm.length !== 6) {
                // console.log(`BAD SHAIN: ${b}`.red)
                return;
            }

            const totalProfit = res_3_with_commision - first_transition_amount;
            if (totalProfit > 0.001) {
                let message = ``;

                console.log(algoritm)
                console.log(symbols)
                console.log(`profit ${totalProfit}`.white);
                console.log('first_transition_amount_log', first_transition_amount_log);
                message = `${symbols}\nprofit ${totalProfit}`
                // bot.telegram.sendMessage(303599057, message);

                const accountInfo = await client.accountInfo();
                const balance = accountInfo.balances.find(i => i.asset === b[0]);
                console.log('balance', balance);
                let balanceUSDT = 0;
                if (balance.asset === 'USDT') {
                    balanceUSDT = balance.free;
                } else {
                    const ticker = tickers.find(i => i.symbol === `${balance.asset}USDT`);
                    balanceUSDT = ticker.bidPrice * balance.free;
                }
                console.log(`balance ${balanceUSDT}$ < ${AMOUNT}$`)
                if (balanceUSDT < AMOUNT) {
                    console.log(`Not enough money ${balanceUSDT} < ${AMOUNT}`.red);
                    return;
                }

                console.log(res_log_1.gray);
                console.log(`____________`.gray);
                console.log(res_log_2.gray);
                console.log(`____________`.gray);
                console.log(res_log_3.gray);
                console.log(`____________`.gray);

                let cancel = null;
                let order = null;
                const attemptsOrder = 1000;
                let accountInfo2 = null;

                if (el_1m) {
                    const el_1m_data = {
                        symbol: el_1m.symbol,
                        side: 'SELL',
                        quantity: res_1,
                        price: el_1m.bidPrice,
                        // stopPrice: el_1m.bidPrice,
                        // stopLimitPrice: el_1m.bidPrice,
                    };
                    console.log('el_1m_data', el_1m_data);
                    const orderTest_1_m = await client.orderTest(el_1m_data);
                    console.log('orderTest_1_m', orderTest_1_m);

                    // if (orderTest_1_m.status !== 'FILLED') {
                    //     for (let i = 0; i < 1; i++) {
                    //         order = await client.getOrder({
                    //             symbol: orderTest_1_m.symbol,
                    //             orderId: orderTest_1_m.orderId,
                    //         });
                    //         console.log(i, order)
                    //         if (order.status === 'FILLED') {
                    //             break;
                    //         }
                    //     }

                    //     if (order.status !== 'FILLED') {
                    //         cancel = await client.cancelOrder({
                    //             symbol: orderTest_1_m.symbol,
                    //             orderId: orderTest_1_m.orderId,
                    //         })
                    //         console.log(`cancel order:`.red, cancel);
                    //         return;
                    //     }
                    // }

                } else if (el_1d) {
                    const el_1d_data = {
                        symbol: el_1d.symbol,
                        side: 'BUY',
                        quantity: res_1,
                        price: el_1d.askPrice,
                        // stopPrice: el_1d.askPrice,
                        // stopLimitPrice: el_1d.askPrice,
                    };
                    console.log('el_1d_data', el_1d_data)
                    const orderTest_1d = await client.orderTest(el_1d_data);
                    console.log('orderTest_1d', orderTest_1d);

                    // if (orderTest_1d.status !== 'FILLED') {
                    //     for (let i = 0; i < 1; i++) {
                    //         order = await client.getOrder({
                    //             symbol: orderTest_1d.symbol,
                    //             orderId: orderTest_1d.orderId,
                    //         });
                    //         console.log(i, order)
                    //         if (order.status === 'FILLED') {
                    //             break;
                    //         }
                    //     }

                    //     if (order.status !== 'FILLED') {
                    //         cancel = await client.cancelOrder({
                    //             symbol: orderTest_1d.symbol,
                    //             orderId: orderTest_1d.orderId,
                    //         })
                    //         console.log(`cancel order:`.red, cancel);
                    //         return;
                    //     }
                    // }
                }

                accountInfo2 = await client.accountInfo();
                console.log('balance', accountInfo2.balances.filter(i => parseFloat(i.free)));


                if (el_2m) {
                    const el_2m_data = {
                        symbol: el_2m.symbol,
                        side: 'SELL',
                        quantity: res_1_with_commision,
                        price: el_2m.bidPrice,
                        // stopPrice: el_2m.bidPrice,
                        // stopLimitPrice: el_2m.bidPrice,
                    };
                    console.log('el_2m_data', el_2m_data);
                    const orderTest_2_m = await client.orderTest(el_2m_data);
                    console.log('orderTest_2_m', orderTest_2_m);

                    // if (orderTest_2_m.status !== 'FILLED') {
                    //     for (let i = 0; i < attemptsOrder; i++) {
                    //         order = await client.getOrder({
                    //             symbol: orderTest_2_m.symbol,
                    //             orderId: orderTest_2_m.orderId,
                    //         });
                    //         console.log(i, order)
                    //         if (order.status === 'FILLED') {
                    //             break;
                    //         }
                    //     }

                    //     if (order.status !== 'FILLED') {
                    //         cancel = await client.cancelOrder({
                    //             symbol: orderTest_2_m.symbol,
                    //             orderId: orderTest_2_m.orderId,
                    //         })
                    //         console.log(`cancel order:`.red, cancel);
                    //         return;
                    //     }
                    // }
                } else if (el_2d) {
                    const el_2d_data = {
                        symbol: el_2d.symbol,
                        side: 'BUY',
                        quantity: res_2,
                        price: el_2d.askPrice,
                        // stopPrice: el_2d.askPrice,
                        // stopLimitPrice: el_2d.askPrice,
                    };
                    console.log('el_2d_data', el_2d_data);
                    const orderTest_2d = await client.orderTest(el_2d_data);
                    console.log('orderTest_2d', orderTest_2d);

                    // if (orderTest_2d.status !== 'FILLED') {
                    //     for (let i = 0; i < attemptsOrder; i++) {
                    //         order = await client.getOrder({
                    //             symbol: orderTest_2d.symbol,
                    //             orderId: orderTest_2d.orderId,
                    //         });
                    //         console.log(i, order)
                    //         if (order.status === 'FILLED') {
                    //             break;
                    //         }
                    //     }

                    //     if (order.status !== 'FILLED') {
                    //         cancel = await client.cancelOrder({
                    //             symbol: orderTest_2d.symbol,
                    //             orderId: orderTest_2d.orderId,
                    //         })
                    //         console.log(`cancel order:`.red, cancel);
                    //         return;
                    //     }
                    // }
                }

                accountInfo2 = await client.accountInfo();
                console.log('balance', accountInfo2.balances.filter(i => parseFloat(i.free)));


                if (el_3m) {
                    const el_3m_data = {
                        symbol: el_3m.symbol,
                        side: 'SELL',
                        quantity: res_2_toFixed_next,
                        price: el_3m.bidPrice,
                        // stopPrice: el_3m.bidPrice,
                        // stopLimitPrice: el_3m.bidPrice,
                    }
                    console.log('el_3m_data', el_3m_data)
                    const orderTest_3_m = await client.orderTest(el_3m_data);
                    console.log('orderTest_3_m', orderTest_3_m);

                    // if (orderTest_3_m.status !== 'FILLED') {
                    //     for (let i = 0; i < attemptsOrder; i++) {
                    //         order = await client.getOrder({
                    //             symbol: orderTest_3_m.symbol,
                    //             orderId: orderTest_3_m.orderId,
                    //         });
                    //         console.log(i, order)
                    //         if (order.status === 'FILLED') {
                    //             break;
                    //         }
                    //     }

                    //     if (order.status !== 'FILLED') {
                    //         cancel = await client.cancelOrder({
                    //             symbol: orderTest_3_m.symbol,
                    //             orderId: orderTest_3_m.orderId,
                    //         })
                    //         console.log(`cancel order:`.red, cancel);
                    //         return;
                    //     }
                    // }

                } else if (el_3d) {
                    const el_3d_data = {
                        symbol: el_3d.symbol,
                        side: 'BUY',
                        quantity: res_3,
                        price: el_3d.askPrice,
                        // stopPrice: el_3d.askPrice,
                        // stopLimitPrice: el_3d.askPrice,
                    };
                    console.log('el_3d_data', el_3d_data);
                    const orderTest_3d = await client.orderTest(el_3d_data);
                    console.log('orderTest_3d', orderTest_3d);

                    // if (orderTest_3d.status !== 'FILLED') {
                    //     for (let i = 0; i < attemptsOrder; i++) {
                    //         order = await client.getOrder({
                    //             symbol: orderTest_3d.symbol,
                    //             orderId: orderTest_3d.orderId,
                    //         });
                    //         console.log(i, order)
                    //         if (order.status === 'FILLED') {
                    //             break;
                    //         }
                    //     }

                    //     if (order.status !== 'FILLED') {
                    //         cancel = await client.cancelOrder({
                    //             symbol: orderTest_3d.symbol,
                    //             orderId: orderTest_3d.orderId,
                    //         })
                    //         console.log(`cancel order:`.red, cancel);
                    //         return;
                    //     }
                    // }
                }

                accountInfo2 = await client.accountInfo();
                console.log('balance', accountInfo2.balances.filter(i => parseFloat(i.free)));

                console.log('____________')
                await sleep(1000);
            } else {
                // console.log(`profit ${totalProfit}`.red);
            }
            // console.log('____________')

        };

        await asyncForEach(dataArray, async (i) => {
            const res = await calcEl(i, 1);
        });
    } catch (e) {
        console.log(`error, ${e.message}`.red);
    }
    bot.launch();
}


const mainRun = async () => {
    const exchangeInfo = await client.exchangeInfo();

    // setTimeout(async () => {
    //     run(exchangeInfo);
    // }, 100);
    try {
        for (let i = 0; i < 10000000000000000000000000; i++) {
            await run(exchangeInfo);
            await sleep(2000);
        }
    } catch (e) {
        console.log('error for', e.message);
    }

}

mainRun();