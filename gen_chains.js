//node --max_old_space_size=8000 gen_chains.js
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

let symbols = fs.readFileSync(path.resolve(__dirname, 'symbols.txt'), 'utf8')
symbols = symbols.split('/');
symbols = _.uniqWith(symbols,_.isEqual); //get uniq chains

let base_symbols = fs.readFileSync(path.resolve(__dirname, 'base_symbols.txt'), 'utf8')
base_symbols = base_symbols.split('\n');

console.log('uniq chains length:', base_symbols.length);

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

async function genChainsByBaseSymbol(symbol){
    const successChains = [];
    const badChains = [];
    let tickers = await client.allBookTickers();
    tickers = Object.values(tickers);

    await symbols.forEach(s_1=>{
        symbols.forEach(s_2=>{
            symbols.forEach(s_3=>{
                if(symbol !== s_1 && s_1 !== s_2 && s_2 !== symbol && s_2 !== s_3 && s_3 !== symbol && s_1 !== s_3) {
                    const el_1 = tickers.find(i => i.symbol === symbol + s_1 || i.symbol === s_1 + symbol);
                    const el_2 = tickers.find(i => i.symbol === s_1 + s_2 || i.symbol === s_2 + s_1);
                    const el_3 = tickers.find(i => i.symbol === s_2 + s_3 || i.symbol === s_3 + s_2);
                    const el_4 = tickers.find(i => i.symbol === symbol + s_3 || i.symbol === s_3 + symbol);
                    let res = symbol + ' ' + s_1 + ' ' + s_2 + ' ' + s_3 + ' ' + symbol;
                    if(el_1 && el_2 && el_3 && el_4) {
                        successChains.push(res);
                    }
                    // console.log(res)
                }
            });
        });
    });
    await fs.appendFileSync(`./data/all_success_chains_4.txt`, successChains.join('\n')+'\n');

    // await fs.writeFileSync(`./data/${symbol}_bad_chains.txt`, badChains.join('\n'));
    // console.log(symbol);
    // console.log('successChains', successChains.length);
    // console.log('badChains', badChains.length);
    // console.log('_____________')
};

// genChainsByBaseSymbol(base_symbols[0]);


asyncForEach(base_symbols, async (i) => {
    await genChainsByBaseSymbol(i);
});
