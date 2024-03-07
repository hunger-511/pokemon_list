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

async function fetchHTML(url) {
    const baseUrl = 'https://wiki.52poke.com/wiki/'
    config.url = baseUrl + url;
    const {data} = await axios(config);
    return cheerio.load(data);
}

async function scrapePokemonData() {

    const $ = await fetchHTML("宝可梦列表（按全国图鉴编号）");
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


    // 改成多线程加快效率
    for (const pokemonDataKey of pokemonData) {

        //最好能失败后多尝试几次
        const $ = await fetchHTML(pokemonDataKey.url);
        console.log(pokemonDataKey.id + "-----" + pokemonDataKey.cName)
        const item = $("#mw-content-text > div.mw-parser-output > table.wiki-nametable > tbody > tr:nth-child(2)")
        const name = $(item).find(".bgwhite").eq(2).text().trim()
        const des = $(item).find(".at-l").text().trim()
        pokemonDataKey.name = name
        pokemonDataKey.des = des
    }



    // 转换数据为二维数组格式
    const data = pokemonData.map(p => [p.id, p.cName, p.jName, p.eName, p.type1, p.type2, p.name, p.des]);

    // 添加表头
    const headers = ['编号', '中文名', '日文名', '英文名', '属性1', '属性2', '假名', '名字来源'];
    data.unshift(headers); // 将表头添加到数据数组的开头

    // 创建工作表
    const sheet = {
        name: '图鉴',
        data: data
    };

    // 构建工作簿
    const buffer = xlsx.build([sheet]);

    // 将工作簿写入文件
    fs.writeFileSync('pokemon_info.xlsx', buffer);

    console.log('数据已保存为Excel文件');

}

scrapePokemonData();
