const binance = require('node-binance-api')().options({
    APIKEY: '',
    APISECRET: '',
    useServerTime: true // If you get timestamp errors, synchronize to server time at startup
});

const axios = require('axios');


//1. сделать делим умножаем умножаем чтобы брал списком с файла


//BTC/REN REN*BNB BNB*BTC

const getUSD = (course, callback) => {
    axios.get(`https://api.cryptonator.com/api/ticker/${course}-usd`)
        .then(function (response) {
            // console.log(response.data.ticker)
            callback(response.data.ticker);
            // handle success
        })
        .catch(function (error) {
            // handle error
            console.log(error);
            callback(null)
        })
        .finally(function () {
            // always executed
        });
};

const run = (amount, last = false, callback) => {


    binance.bookTickers('RENBTC', (error, ticker) => {
        const AMOUT = amount;
        console.log('AMOUNT', AMOUT)
        const REN = AMOUT / ticker.askPrice;
        console.log('REN', REN)
        // console.log(ticker)
        getUSD('REN', usd => {
            // console.log(usd)
            const OFFER_REN = ticker.askQty * usd.price;
            console.log('OFFER_REN', OFFER_REN)


            binance.bookTickers('RENBNB', (error, ticker) => {
                const BNB = REN * ticker.bidPrice;
                console.log('BNB', BNB)

                const OFFER_BNB = ticker.bidQty * usd.price;
                console.log('OFFER_BNB', OFFER_BNB);

                binance.bookTickers('BNBBTC', (error, ticker) => {
                    // console.log(ticker)
                    getUSD('BNB', usd => {

                        const BTC = BNB * ticker.bidPrice;
                        let COMISSION = 0;
                        if(last){
                            COMISSION = (BTC / 100) * (0.0750 * 3);
                        }
                        console.log('BTC', BTC - COMISSION)


                        const OFFER_BTC = ticker.bidQty * usd.price;
                        console.log('OFFER_BTC', OFFER_BTC)

                        let MINIMAL_OFFER = 0;
                        if (OFFER_BTC < OFFER_REN && OFFER_BTC < OFFER_BNB) {
                            MINIMAL_OFFER = OFFER_BTC;
                        } else if (OFFER_BNB < OFFER_BTC && OFFER_BNB < OFFER_REN) {
                            MINIMAL_OFFER = OFFER_BNB;
                        } else if (OFFER_REN < OFFER_BTC && OFFER_REN < OFFER_BNB) {
                            MINIMAL_OFFER = OFFER_REN;
                        }

                        getUSD('BTC', usd => {
                            const res = (MINIMAL_OFFER * 0.95) / usd.price;
                            if(!last) {
                                console.log('MINIMAL_OFFER', MINIMAL_OFFER)

                                console.log('RES BTC', res)
                            }else{
                                console.log('BTC', BTC - COMISSION)
                            }
                            callback(res)
                            console.log('\n\n')
                        });

                    });
                });
            });

        })

    });

}

run(1, false, res=>{
    run(res, true, res2=>{

    })
})