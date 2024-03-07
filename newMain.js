const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const xlsx = require('node-xlsx');

const config = {
    method: 'get',
    headers: {
        'Cookie': 'Cookies=Idea-b9c34058=32bd867a-4e72-4c9a-84c3-ac5b3c10d759; JSESSIONID=A040715F579622A42F07EBBC06BCDC46',
        'User-Agent': 'Apifox/1.0.0 (https://www.apifox.cn)',
        'Accept': '*/*',
        'Host': 'wiki.52poke.com',
        'Connection': 'keep-alive'
    }
};

// 辅助函数，用于实现延迟
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHTML(url) {
    const baseUrl = 'https://wiki.52poke.com/wiki/';
    config.url = baseUrl + url;
    try {
        const response = await axios(config);
        return cheerio.load(response.data);
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        return null;
    }
}

async function fetchPokemonList() {
    const $ = await fetchHTML("宝可梦列表（按全国图鉴编号）");
    if (!$) return [];

    let pokemonData = [];

    $("#mw-content-text > div.mw-parser-output > div table").each((i, element) => {
        if (i === 0) return; // 跳过表头
        $(element).find("tbody").find("tr").each((index,pm) => {
            const id = $(pm).find(".rdexn-id").text().trim()
            const cName = $(pm).find(".rdexn-name").find("a").text().trim()
            const jName = $(pm).find(".rdexn-jpname").text().trim()
            const eName = $(pm).find(".rdexn-enname").text().trim()
            const type1 = $(pm).find(".rdexn-type1").find("a").text().trim()
            const type2 = $(pm).find(".rdexn-type2").find("a").text().trim()

            const url = ($(pm).find(".rdexn-name").find("a").prop("href")+"").slice(6)
            if (id){

                pokemonData.push({ id, cName, jName, eName, type1, type2 ,url});
            }
        })

    })

    return pokemonData;
}

async function scrapeIndividualPokemonData(pokemon) {
    await sleep(500); // 在每个请求之间等待1秒
    const $ = await fetchHTML(pokemon.url);
    if (!$) return null;

    const item = $("#mw-content-text > div.mw-parser-output > table.wiki-nametable > tbody > tr:nth-child(2)")
    const name = $(item).find(".bgwhite").eq(2).text().trim()
    const des = $(item).find(".at-l").text().trim()
    pokemon.name = name
    pokemon.des = des
    console.log(pokemon.id + "-----" + pokemon.cName)
    return {
        ...pokemon,
        name,
        des
    };
}

async function scrapePokemonData() {
    try {
        const pokemonList = await fetchPokemonList();
        const detailedDataPromises = pokemonList.map(pokemon => scrapeIndividualPokemonData(pokemon)
        );
        const detailedData = await Promise.all(detailedDataPromises);

        const data = detailedData
            .filter(pokemon => pokemon !== null) // Filter out any null values due to failed requests
            .map(p => [p.id, p.cName, p.jName, p.eName, p.type1, p.type2, p.name, p.des]);

        const headers = ['编号', '中文名', '日文名', '英文名', '属性1', '属性2', '假名', '名字来源'];
        data.unshift(headers);

        const buffer = xlsx.build([{ name: '图鉴', data }]);
        fs.writeFileSync('pokemon_info.xlsx', buffer);

        console.log('数据已保存为Excel文件');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

scrapePokemonData();
