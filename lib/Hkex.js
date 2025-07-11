
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import Utils from './Utils.js';
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import ENum from './ENum.js';

export default class Hkex {
    static URL = {
        LANDING_PAGE: 'https://www.hkex.com.hk',
    }

    constructor(args) {
        args = args || {}
    }

    downloadFiles = async (args) => {
        args = args || {}
        const { fileList } = args

        // Launch browser
        const browser = await puppeteer.launch({ headless: false }); // Set headless: false for debugging
        const page = await browser.newPage();

        try {
            // Navigate to login page
            await page.goto(Hkex.URL.LANDING_PAGE, { waitUntil: 'networkidle2' });

            await Utils.delay(1000);

            for (const fileInfo of fileList) {
                if (fileInfo.sourceType === ENum.SOURCE_TYPE.HTML_BODY_TEXT_CONTENT) {
                    await page.goto(fileInfo.fromFile, { waitUntil: 'load' });
                    const content = await page.evaluate(() => document.body.textContent);
                    console.log(content);
                    await fs.writeFile(fileInfo.downloadFile, content);
                }
                await Utils.delay(1000);
                // const content = await page.content();
                // const fileContent = await page.evaluate(async (fetchFile) => {
                //     const response = await fetch(fetchFile, {
                //         method: 'GET',
                //         credentials: 'include', // Include cookies for authenticated request
                //     });
                //     if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
                //     return Array.from(new Uint8Array(await response.arrayBuffer())); // Convert to array for serialization
                // }, fileInfo.fromFile);

                // Save file
            }

        } catch (error) {
            console.error('error:', error);
        } finally {
            // Close browser
            // await browser.close();
        }
    }

    static getDataFromFile = async (args) => {
        args = args || {}
        const { fileInfo } = args
        if (fileInfo.fileType === ENum.FILE_TYPE.DAYQUOT) {
            const json = Hkex.getDataFromDayquot(args)
            return json;
        }
    }

    static getDataFromDayquot = async (args) => {
        args = args || {}
        const { fileInfo } = args
        // read from fileInfo.downloadFile
        const content = await fs.readFile(fileInfo.downloadFile, 'utf-8');

        // loop for each line
        const lines = content.split('\n');

        const SECTION_TYPE = Object.freeze({
            HEADER: 'HEADER',
            TABLE_OF_CONTENT: 'TABLE_OF_CONTENT',
            // TABLE_OF_CONTENT_END: 'TABLE_OF_CONTENT_END',
            MARKET_HIGHLIGHTS: 'MARKET_HIGHLIGHTS',
            TODAY: 'TODAY',
            TEN_MOST_ACTIVES_DOLLARS: 'TEN_MOST_ACTIVES_DOLLARS',
            TEN_MOST_ACTIVES_SHARES: 'TEN_MOST_ACTIVES_SHARES',
            QUOTATIONS: 'QUOTATIONS',
            QUOTATIONS_END: 'QUOTATIONS_END',
        })
        let currSection = SECTION_TYPE.HEADER;
        let lineIdx = 0;
        const jsonData = {}
        const quotations = []
        for (const line of lines) {
            if (line.trim() === '目錄') {
                currSection = SECTION_TYPE.TABLE_OF_CONTENT;
                lineIdx = 0;
                continue;
            }
            // if (currSection === SECTION_TYPE.TABLE_OF_CONTENT && line.trim() === '---------------------------------------------------------------------------------------------------------') {
            //     currSection = SECTION_TYPE.TABLE_OF_CONTENT_END;
            //     lineIdx = 0;
            //     continue;
            // }
            if (currSection === SECTION_TYPE.TABLE_OF_CONTENT && lineIdx > 4 && line.trim() === '市場概要') {
                currSection = SECTION_TYPE.MARKET_HIGHLIGHTS;
                lineIdx = 0;
                continue;
            }
            if (currSection === SECTION_TYPE.MARKET_HIGHLIGHTS && lineIdx > 4 && line.trim() === '今日  Today') {
                currSection = SECTION_TYPE.TODAY;
                lineIdx = 0;
                continue;
            }
            if (currSection === SECTION_TYPE.TODAY && line.trim() === '十大成交金額最多股票     10 MOST ACTIVES (DOLLARS)') {
                currSection = SECTION_TYPE.TEN_MOST_ACTIVES_DOLLARS;
                lineIdx = 0;
                continue;
            }
            if (currSection === SECTION_TYPE.TEN_MOST_ACTIVES_DOLLARS && line.trim() === '十大成交股數最多股票     10 MOST ACTIVES (SHARES)') {
                currSection = SECTION_TYPE.TEN_MOST_ACTIVES_SHARES;
                lineIdx = 0;
                continue;
            }
            if (currSection === SECTION_TYPE.TEN_MOST_ACTIVES_SHARES && line.trim() === '報價') {
                currSection = SECTION_TYPE.QUOTATIONS;
                lineIdx = 0;
                continue;
            }
            if (currSection === SECTION_TYPE.QUOTATIONS && line.trim() === '---------------------------------------------------------------------------------------------------------') {
                currSection = SECTION_TYPE.QUOTATIONS_END;
                lineIdx = 0;
                break;
            }


            lineIdx++;
            console.log(`section: ${currSection}, lineIdx: ${lineIdx}, line: ${line}`);

            if (currSection === SECTION_TYPE.HEADER) {
                if (lineIdx === 4) {
                    const regex = /(\d+)\/(\d+)/;
                    const match = line.match(regex);

                    if (match) {
                        jsonData.dayIndex = parseInt(match[1], 10);
                        jsonData.dateYYMMDD = match[2]
                    }

                }
            }
            if (currSection === SECTION_TYPE.MARKET_HIGHLIGHTS) {
                if (lineIdx === 7) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.securityTraded = Number(match[0]);
                    }
                }
                if (lineIdx === 8) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.advanced = Number(match[0]);
                    }
                }
                if (lineIdx === 9) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.declined = Number(match[0]);
                    }
                }
                if (lineIdx === 10) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.unchanged = Number(match[0]);
                    }
                }
                if (lineIdx === 12) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.turnover = Number(match.join(''));
                    }
                }
                if (lineIdx === 13) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.shares = Number(match.join(''));
                    }
                }
                if (lineIdx === 14) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.deals = Number(match.join(''));
                    }
                }
                if (lineIdx === 15) {
                    const regex = /\d+(?:\.\d+)?/g;
                    const match = line.match(regex);

                    if (match) {
                        // console.table(match)
                        jsonData.turnoverInCny = Number(match.join(''));
                    }
                }
            }
            if (currSection === SECTION_TYPE.TODAY) {
            }
            if (currSection === SECTION_TYPE.QUOTATIONS) {
                if (lineIdx >= 6) {
                    const symbol = line.slice(1, 6).trim()
                    const nameEng = line.slice(7, 22).trim()
                    const nameChi = line.slice(22, 31).trim()
                    const cur = line.slice(31, 34).trim()
                    console.log(`symbol: [${symbol}], nameEng: [${nameEng}], nameChi: [${nameChi}], cur: [${cur}]`)

                    const info = {
                        symbol: symbol,
                        nameEng: nameEng,
                        nameChi: nameChi,
                        cur: cur
                    }

                    const other = line.slice(34)
                    console.log(other)
                    if (other.endsWith('暫停買賣')) {
                        info.isSuspended = true
                    } else if (other.endsWith('短暫停牌')) {
                        info.hsHalted = true
                    } else {
                        info.isSuspended = false
                        const prices = other.trim().split(/\s+/)
                        console.log(prices)
                        const prevClose = Utils.getNumber(prices[0])
                        const openBid = Utils.getNumber(prices[1])
                        const openAsk = Utils.getNumber(prices[2])
                        const high = Utils.getNumber(prices[3])
                        const low = Utils.getNumber(prices[4])
                        const close = Utils.getNumber(prices[5])
                        const volume = Utils.getNumber(prices[6])
                        const turnover = Utils.getNumber(prices[7])

                        info.prevClose = prevClose
                        info.openBid = openBid
                        info.openAsk = openAsk
                        info.high = high
                        info.low = low
                        info.close = close
                        info.volume = volume
                        info.turnover = turnover
                    }

                    quotations.push(info)
                    // const lineAdj = line.replace(/,/g, "");
                    // const regex = /\d+(?:\.\d+)?/g;
                    // const match = lineAdj.match(regex);
                    // if (match) {
                    //     if (match[0] === "10388") {
                    //         console.log(match.join(','))

                    //         break;
                    //     }
                    // }
                    // // const regex = /^(\d+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/gm;
                    // const data = `...your data rows...`;

                    // const match = line.matchAll(regex);

                    // if (match) {
                    //     console.table(match)
                    //     jsonData.turnoverInCny = Number(match.join(''));
                    // }

                    // if (lineIdx > 120) {
                    //     break;
                    // }
                }

            }

        }
        // console.log(jsonData)
        jsonData.quotations = quotations
        // console.table(quotations.slice(-10))
        return jsonData;
    }


}