const Binance = require('binance-api-node').default

// Authenticated client, can make signed calls
const client = Binance({
    apiKey: '',
    apiSecret: '',
});


const run = async () => {
    //BALANCE
    const accountInfo = await client.accountInfo();
    const balance = accountInfo.balances.filter(i => parseFloat(i.free));
    console.log('balance', balance);

    // const balanceBTC = accountInfo.balances.find(i => i.asset === 'BTC');
    // console.log('balanceBTC', balanceBTC)


    // let tickers = await client.allBookTickers();
    // tickers = Object.values(tickers);
    // const ticker = tickers.find(i=>i.symbol === `${balanceBTC.asset}USDT`)
    // console.log('ticker', ticker.bidPrice * balanceBTC.free)



    // const cancel = await client.cancelOrder({
    //     symbol: 'BTCUSDT',
    //     orderId: 7640100682,
    // });
    // console.log('cancel', cancel)

};

run();
