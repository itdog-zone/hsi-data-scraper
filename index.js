import fs from 'fs';
import 'dotenv/config';
import { DateTime } from 'luxon';
import Args from './lib/Args.js';
import Hsi from './lib/Hsi.js';
import GitHub from './lib/Github.js';
import Utils from './lib/Utils.js';
import HkGov from './lib/HkGov.js';


(
    async () => {
        console.log('Running with Node.js version:', process.version);
        
        // setup date for processing
        // data generate on next day 0100 -> scrape the previous day data
        let date = DateTime.now().plus({ days: -1 }).startOf('day');
        console.log(`init Date: ${date.toFormat('yyyy-MM-dd')}`);

        // args input, override the default date
        const dateInput = Args.getValue('date');
        if (dateInput) {
            const inputDate = DateTime.fromISO(dateInput);
            if (inputDate.isValid) {
                date = inputDate;
            }
        }
        console.log(`process Date: ${date.toFormat('yyyy-MM-dd')} (${date.toFormat('ccc')})`);

        const dateList = []

        // get holidays
        const holidays = await HkGov.getHolidayList();
        if (holidays.find(x => x.date === date.toFormat('yyyyMMdd')) !== undefined) {
            const msg = `skip on holiday: ${date.toFormat('yyyy-MM-dd')}`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
        }
        else if (date.weekday === 6 || date.weekday === 7) {
            const msg = `skip on sat and sun: ${date.toFormat('yyyy-MM-dd')} (${date.toFormat('ccc')})`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
        } else {
            dateList.push(date)
        }

        if (dateList.length === 0) {
            const msg = `No data process`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
            process.exit(0)
        }



        // create file list for processing
        const fileList = []
        const idxList = ['hsi', 'hscei', 'hstech']
        for (const dd of dateList) {
            for (const _idx of idxList) {
                fileList.push({
                    source: 'hsi', fromFile: `https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/${_idx}/constituents_${dd.toFormat('dLLLyy')}.pdf`,
                    downloadFile: `./download/${dd.toFormat('yyyyMMdd')}_${_idx}.pdf`,
                    jsonFile: `./download/${dd.toFormat('yyyyMMdd')}_${_idx}.json`
                })
            }
        }

        console.table(dateList)
        console.table(fileList)
        return;

        // Loop for 3 main index
        const github = new GitHub({ owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, token: process.env.GITHUB_TOKEN });
        for (const _idx of idxList) {
            const filename = `${date.toFormat('yyyyMMdd')}_${_idx}`

            const pdfToProcess = `./download/${filename}.pdf`
            const jsonToProcess = `./download/${filename}.json`

            if (!fs.existsSync(pdfToProcess)) {
                console.log(`process to download file at: ${date.toFormat('yyyy-MM-dd')}`)
                // process to download
                const hsi = new Hsi({ username: process.env.HSI_USERNAME, password: process.env.HSI_PASSWORD, date });
                await hsi.downloadConstituentsPdf();
                console.log(`process to download file at: ${date.toFormat('yyyy-MM-dd')}...done`)
            }

            if (fs.existsSync(pdfToProcess)) {

                console.log(`process to extract data: ${pdfToProcess}`)
                const indexJsonData = await Hsi.getDataFromPdf({ filePath: pdfToProcess, index: _idx, date: date.toFormat('yyyyMMdd') })
                fs.writeFileSync(jsonToProcess, JSON.stringify(indexJsonData, null, 2));

                console.log(`process to upload file: ${pdfToProcess}`)
                await github.uploadConstituentsPdf({ path: `hkex/constituents/pdf/${filename}.pdf`, filePath: pdfToProcess });
                await Utils.delay(200);
                console.log(`process to upload file: ${jsonToProcess}`)
                await github.uploadConstituentsPdf({ path: `hkex/constituents/json/${filename}.json`, filePath: jsonToProcess });
                await Utils.delay(200);
                if (Args.getValue('keep') !== 'true') {
                    fs.rmSync(pdfToProcess);
                    fs.rmSync(jsonToProcess);
                }
            }
        }

        await Utils.sendMessage({ msg: `process done at: ${date.toFormat('yyyy-MM-dd')} (${date.toFormat('ccc')})` });
        process.exit(0)
    }
)();
