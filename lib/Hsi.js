import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import Utils from './Utils.js';
import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export default class Hsi {
    static URL = {
        LOGIN: 'https://www.hsi.com.hk/eng/index360/login',
    }

    constructor(args) {
        args = args || {}
        const { username, password, date } = args
        this.args = { username, password, date }

        if (this.args.username === undefined || this.args.password === undefined) {
            throw new Error('username, password is required')
        }
    }

    downloadConstituentsPdf = async (args) => {
        args = args || {}
        const { fileList } = args

        // Launch browser
        const browser = await puppeteer.launch({ headless: true }); // Set headless: false for debugging
        const page = await browser.newPage();

        try {
            // Navigate to login page
            await page.goto('https://www.hsi.com.hk/eng/index360/login', { waitUntil: 'networkidle2' });

            await page.waitForSelector('[placeholder="Please enter your email"]', { timeout: 5000 });

            // input email
            // Find all elements with the placeholder
            const usernameFields = await page.$$('[placeholder="Please enter your email"]');

            // Check if any elements were found
            if (usernameFields.length === 0) {
                throw new Error('No username field found with the specified placeholder');
            }

            // Select the first matching element and type the username
            await usernameFields[0].type(this.args.username); // Replace with your username

            // input password
            // Find all elements with the placeholder
            const passwordFields = await page.$$('[placeholder="Please enter your password"]');

            // Check if any elements were found
            if (passwordFields.length === 0) {
                throw new Error('No password field found with the specified placeholder');
            }

            // Select the first matching element and type the password
            await passwordFields[0].type(this.args.password); // Replace with your password

            // Click login button
            await page.click('.log-on-bt');

            await page.waitForNavigation();

            await page.goto('https://www.hsi.com.hk/index360/eng/indexes', { waitUntil: 'networkidle2' });

            await Utils.delay(1000);


            for (const fileInfo of fileList) {
                if (fileInfo.source === 'hsi') {
                        const fileContent = await page.evaluate(async (fetchFile) => {
                            const response = await fetch(fetchFile, {
                                method: 'GET',
                                credentials: 'include', // Include cookies for authenticated request
                            });
                            if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
                            return Array.from(new Uint8Array(await response.arrayBuffer())); // Convert to array for serialization
                        }, fileInfo.fromFile);

                        // Save PDF file
                        await fs.writeFile(fileInfo.downloadFile, Buffer.from(fileContent), 'binary');

                        await Utils.delay(1000);

                }
            }

            // const idxList = ['hsi', 'hscei', 'hstech']
            // // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hsi/constituents_16Jun25.pdf
            // // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hscei/constituents_17Jun25.pdf
            // // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hstech/constituents_17Jun25.pdf

            // for (const _idx of idxList) {
            //     // Fetch PDF content as binary
            //     const fileContent = await page.evaluate(async (_idx, dd) => {
            //         // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hsi/constituents_03Jun25.pdf
            //         // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hsi/constituents_2Jun25.pdf
            //         const fetchFile = `https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/${_idx}/constituents_${dd}.pdf`
            //         const response = await fetch(fetchFile, {
            //             method: 'GET',
            //             credentials: 'include', // Include cookies for authenticated request
            //         });
            //         if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
            //         return Array.from(new Uint8Array(await response.arrayBuffer())); // Convert to array for serialization
            //     }, _idx, this.args.date.toFormat('dLLLyy'));

            //     // Save PDF file
            //     await fs.writeFile(`./download/${this.args.date.toFormat('yyyyMMdd')}_${_idx}.pdf`, Buffer.from(fileContent), 'binary');

            //     await Utils.delay(1000);

            // }


        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            // Close browser
            await browser.close();
        }
    }

    static getDataFromPdf = async (args) => {
        args = args || {}
        const { filePath, index, date: key } = args
        if (index === 'hsi') {
            return await Hsi.getHsiDataFromPdf(args)
        } else if (index === 'hscei') {
            return await Hsi.getHsceiDataFromPdf(args)
        } else if (index === 'hstech') {
            return await Hsi.getHstechDataFromPdf(args)
        }
    }

    static getHsiDataFromPdf = async (args) => {
        args = args || {}
        const { filePath, index, date: key } = args

        function isChineseWord(str) {
            // Matches CJK characters (simplified/traditional Chinese)
            return /[\u4E00-\u9FFF]/.test(str);
        }

        function splitBeforeChinese(str) {
            let splitIndex = 0;
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i);
                if (charCode >= 0x4E00 && charCode <= 0x9FFF) {
                    splitIndex = i;
                    break;
                }
            }

            if (splitIndex === 0) {
                return [str, ''];
            }

            return [str.slice(0, splitIndex).trim(), str.slice(splitIndex).trim()];
        }

        try {
            // Read the PDF file into a buffer
            const pdfData = readFileSync(filePath);
            const pdfDataArray = new Uint8Array(pdfData);

            // Load the PDF document
            const pdfDocument = await getDocument({
                data: pdfDataArray,
                standardFontDataUrl: new URL('node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href,
            }).promise;


            // Iterate through all pages
            const dataList = [];
            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();

                let info = {}
                for (const item of textContent.items) {
                    const itemStr = item.str.replace(/‑/, '-')
                    if (itemStr === ' ') { continue }
                    if (itemStr === key || itemStr.startsWith('Page')) {
                        if (Object.keys(info).length > 0) { dataList.push(info) }

                        // // console.log(JSON.stringify(info))
                        info = { ...{} };
                        info['tradeDate'] = key
                        info['_pos'] = 1
                        continue;
                    }

                    if (info['_pos'] === 1) {
                        if (itemStr.endsWith('.HK')) {
                            info['_pos'] = 2
                        } else {
                            const [engName, chiName] = splitBeforeChinese(itemStr);
                            info['indexChi'] = chiName
                            info['index'] = engName
                            // const wordList = itemStr.split(' ')
                            // for (const word of wordList) {
                            //     if (isChineseWord(word)) {
                            //         info['indexChi'] = ((info['indexChi'] || '') + word).trim()
                            //     } else {
                            //         info['index'] = ((info['index'] || '') + ` ${word}`).trim()
                            //     }
                            // }
                        }
                    }
                    if (info['_pos'] === 2) {
                        if (itemStr.endsWith('.HK')) {
                            info['stockCode'] = itemStr
                            info['_pos'] = 3
                            continue;
                        }
                    }
                    if (info['_pos'] === 3) {
                        if (itemStr.endsWith('Hong Kong')) {
                            info['_pos'] = 4

                            const [engName, chiName] = splitBeforeChinese(info['stockNameFull']);
                            info['stockNameEng'] = engName
                            info['stockNameChi'] = chiName

                        } else {
                            info['stockNameFull'] = ((info['stockNameFull'] || '') + (isChineseWord(itemStr) ? `${itemStr}` : ` ${itemStr}`)).trim()
                            // if (isChineseWord(itemStr)) {
                            //     info['stockNameChi'] = ((info['stockNameChi'] || '') + ` ${itemStr}`).trim()
                            // } else {
                            //     info['stockName'] = ((info['stockName'] || '') + ` ${itemStr}`).trim()
                            // }
                            continue;
                        }
                    }
                    if (info['_pos'] === 4) {
                        if (itemStr === '香港') {
                            info['exchangeListed'] = (info['exchangeListed'] || '') + ` ${itemStr}`
                            info['_pos'] = 5
                            continue;
                        }
                        info['exchangeListed'] = (info['exchangeListed'] || '') + itemStr
                    }
                    if (info['_pos'] === 5) {
                        if (itemStr === 'HKD') {
                            info['tradingCurrency'] = itemStr
                            info['_pos'] = 7
                            continue;
                        } else {
                            info['industry'] = (info['industry'] || '') + itemStr
                            continue;
                        }
                    }
                    if (info['_pos'] === 7) {
                        info['closingPrice'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 8
                        continue;
                    }
                    if (info['_pos'] === 8) {
                        info['percentChange'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 9
                        continue;
                    }
                    if (info['_pos'] === 9) {
                        info['indexPointContribution'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 10
                        continue;
                    }
                    if (info['_pos'] === 10) {
                        info['weightingPercent'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 11
                        continue;
                    }
                    if (info['_pos'] === 11) {
                        info['weightingPercentIn'] = Number(itemStr.replace(/‑/, '-'))
                        info['weightingPercentInX'] = Math.floor(item.transform[4])
                        info['weightingPercentIn_'] = item.transform.join(',')
                        info['_pos'] = 12
                        continue;
                    }
                    if (info['_pos'] === 12) {
                        info['dividendYieldPercent'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 13
                        continue;
                    }
                    if (info['_pos'] === 13) {
                        info['peRatio'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 14
                        continue;
                    }
                    if (info['_pos'] === 15) {
                        info['unknow'] = (info['unknow'] || '') + itemStr
                        continue;
                    }
                }
            }

            return dataList;
        } catch (err) {
            console.error('Error processing PDF:', err);
            throw err;
        }
    }

    static getHsceiDataFromPdf = async (args) => {
        args = args || {}
        const { filePath, index, date: key } = args

        function isChineseWord(str) {
            // Matches CJK characters (simplified/traditional Chinese)
            return /[\u4E00-\u9FFF]/.test(str);
        }

        function splitBeforeChinese(str) {
            let splitIndex = 0;
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i);
                if (charCode >= 0x4E00 && charCode <= 0x9FFF) {
                    splitIndex = i;
                    break;
                }
            }

            if (splitIndex === 0) {
                return [str, ''];
            }

            return [str.slice(0, splitIndex).trim(), str.slice(splitIndex).trim()];
        }

        try {
            // Read the PDF file into a buffer
            const pdfData = readFileSync(filePath);
            const pdfDataArray = new Uint8Array(pdfData);

            // Load the PDF document
            const pdfDocument = await getDocument({
                data: pdfDataArray,
                standardFontDataUrl: new URL('node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href,
            }).promise;


            // Iterate through all pages
            const dataList = [];
            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();

                let info = {}
                for (const item of textContent.items) {
                    const itemStr = item.str.replace(/‑/, '-')
                    if (itemStr === ' ') { continue }
                    if (itemStr === key || itemStr.startsWith('Page')) {
                        if (Object.keys(info).length > 0) { dataList.push(info) }

                        // console.log(JSON.stringify(info))
                        info = { ...{} };
                        info['tradeDate'] = key
                        info['_pos'] = 1
                        continue;
                    }
                    if (info['_pos'] === 1) {
                        if (itemStr.endsWith('.HK')) {
                            info['_pos'] = 2
                        } else {
                            info['index'] = ((info['index'] || '') + ` ${itemStr}`).trim()

                            // const [engName, chiName] = splitBeforeChinese(itemStr);
                            // info['indexChi'] = chiName
                            // info['index'] = engName
                            // const wordList = itemStr.split(' ')
                            // for (const word of wordList) {
                            //     if (isChineseWord(word)) {
                            //         info['indexChi'] = ((info['indexChi'] || '') + word).trim()
                            //     } else {
                            //         info['index'] = ((info['index'] || '') + ` ${word}`).trim()
                            //     }
                            // }
                        }
                    }
                    if (info['_pos'] === 2) {
                        if (itemStr.endsWith('.HK')) {
                            info['stockCode'] = itemStr
                            info['_pos'] = 3
                            continue;
                        }
                    }
                    if (info['_pos'] === 3) {
                        if (itemStr.endsWith('香港')) {
                            info['_pos'] = 4

                            const [engName, chiName] = splitBeforeChinese(info['stockNameFull']);
                            info['stockNameEng'] = engName
                            info['stockNameChi'] = chiName

                        } else {
                            info['stockNameFull'] = ((info['stockNameFull'] || '') + (isChineseWord(itemStr) ? `${itemStr}` : ` ${itemStr}`)).trim()
                            // if (isChineseWord(itemStr)) {
                            //     info['stockNameChi'] = ((info['stockNameChi'] || '') + ` ${itemStr}`).trim()
                            // } else {
                            //     info['stockName'] = ((info['stockName'] || '') + ` ${itemStr}`).trim()
                            // }
                            continue;
                        }
                    }
                    if (info['_pos'] === 4) {
                        if (itemStr === 'Hong Kong 香港') {
                            info['exchangeListed'] = (info['exchangeListed'] || '') + ` ${itemStr}`
                            info['_pos'] = 5
                            continue;
                        }
                        info['exchangeListed'] = (info['exchangeListed'] || '') + itemStr
                    }
                    if (info['_pos'] === 5) {
                        if (itemStr === 'HKD') {
                            info['tradingCurrency'] = itemStr
                            info['_pos'] = 7
                            continue;
                        } else {
                            info['industry'] = (info['industry'] || '') + itemStr
                            continue;
                        }
                    }
                    if (info['_pos'] === 7) {
                        info['closingPrice'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 8
                        continue;
                    }
                    if (info['_pos'] === 8) {
                        info['percentChange'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 9
                        continue;
                    }
                    if (info['_pos'] === 9) {
                        info['indexPointContribution'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 10
                        continue;
                    }
                    if (info['_pos'] === 10) {
                        info['weightingPercent'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 11
                        continue;
                    }
                    if (info['_pos'] === 11) {
                        info['dividendYieldPercent'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 12
                        continue;
                    }
                    if (info['_pos'] === 12) {
                        info['peRatio'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 13
                        continue;
                    }
                    if (info['_pos'] === 14) {
                        info['unknow'] = (info['unknow'] || '') + itemStr
                        continue;
                    }
                }

            }

            return dataList;
        } catch (err) {
            console.error('Error processing PDF:', err);
            throw err;
        }
    }

    static getHstechDataFromPdf = async (args) => {
        args = args || {}
        const { filePath, index, date: key } = args

        function isChineseWord(str) {
            // Matches CJK characters (simplified/traditional Chinese)
            return /[\u4E00-\u9FFF]/.test(str);
        }

        function splitBeforeChinese(str) {
            let splitIndex = 0;
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i);
                if (charCode >= 0x4E00 && charCode <= 0x9FFF) {
                    splitIndex = i;
                    break;
                }
            }

            if (splitIndex === 0) {
                return [str, ''];
            }

            return [str.slice(0, splitIndex).trim(), str.slice(splitIndex).trim()];
        }

        try {
            // Read the PDF file into a buffer
            const pdfData = readFileSync(filePath);
            const pdfDataArray = new Uint8Array(pdfData);

            // Load the PDF document
            const pdfDocument = await getDocument({
                data: pdfDataArray,
                standardFontDataUrl: new URL('node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href,
            }).promise;


            // Iterate through all pages
            const dataList = [];
            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();

                let info = {}
                for (const item of textContent.items) {
                    const itemStr = item.str.replace(/‑/, '-')
                    if (itemStr === ' ') { continue }
                    if (itemStr === key || itemStr.startsWith('Page')) {
                        if (Object.keys(info).length > 0) { dataList.push(info) }

                        // console.log(JSON.stringify(info))
                        info = { ...{} };
                        info['tradeDate'] = key
                        info['_pos'] = 1
                        continue;
                    }
                    if (info['_pos'] === 1) {
                        if (itemStr.endsWith('.HK')) {
                            info['_pos'] = 2
                        } else {
                            info['index'] = ((info['index'] || '') + ` ${itemStr}`).trim()

                            // const [engName, chiName] = splitBeforeChinese(itemStr);
                            // info['indexChi'] = chiName
                            // info['index'] = engName
                            // const wordList = itemStr.split(' ')
                            // for (const word of wordList) {
                            //     if (isChineseWord(word)) {
                            //         info['indexChi'] = ((info['indexChi'] || '') + word).trim()
                            //     } else {
                            //         info['index'] = ((info['index'] || '') + ` ${word}`).trim()
                            //     }
                            // }
                        }
                    }
                    if (info['_pos'] === 2) {
                        if (itemStr.endsWith('.HK')) {
                            info['stockCode'] = itemStr
                            info['_pos'] = 3
                            continue;
                        }
                    }
                    if (info['_pos'] === 3) {
                        if (itemStr.endsWith('香港')) {
                            info['_pos'] = 4

                            const [engName, chiName] = splitBeforeChinese(info['stockNameFull']);
                            info['stockNameEng'] = engName
                            info['stockNameChi'] = chiName

                        } else {
                            info['stockNameFull'] = ((info['stockNameFull'] || '') + (isChineseWord(itemStr) ? `${itemStr}` : ` ${itemStr}`)).trim()
                            // if (isChineseWord(itemStr)) {
                            //     info['stockNameChi'] = ((info['stockNameChi'] || '') + ` ${itemStr}`).trim()
                            // } else {
                            //     info['stockName'] = ((info['stockName'] || '') + ` ${itemStr}`).trim()
                            // }
                            continue;
                        }
                    }
                    if (info['_pos'] === 4) {
                        if (itemStr === 'Hong Kong 香港') {
                            info['exchangeListed'] = (info['exchangeListed'] || '') + ` ${itemStr}`
                            info['_pos'] = 5
                            continue;
                        }
                        info['exchangeListed'] = (info['exchangeListed'] || '') + itemStr
                    }
                    if (info['_pos'] === 5) {
                        if (itemStr === 'HKD') {
                            info['tradingCurrency'] = itemStr
                            info['_pos'] = 7
                            continue;
                        } else {
                            info['industry'] = (info['industry'] || '') + itemStr
                            continue;
                        }
                    }
                    if (info['_pos'] === 7) {
                        info['closingPrice'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 8
                        continue;
                    }
                    if (info['_pos'] === 8) {
                        info['percentChange'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 9
                        continue;
                    }
                    if (info['_pos'] === 9) {
                        info['indexPointContribution'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 10
                        continue;
                    }
                    if (info['_pos'] === 10) {
                        info['weightingPercent'] = Number(itemStr.replace(/‑/, '-'))
                        info['_pos'] = 11
                        continue;
                    }
                    if (info['_pos'] === 11) {
                        info['unknow'] = (info['unknow'] || '') + itemStr
                        continue;
                    }
                }

            }

            return dataList;
        } catch (err) {
            console.error('Error processing PDF:', err);
            throw err;
        }
    }
}