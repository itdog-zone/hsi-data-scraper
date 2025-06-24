import fs from 'fs';
import 'dotenv/config';
import { DateTime } from 'luxon';
import Args from './lib/Args.js';
import Hsi from './lib/Hsi.js';
import GitHub from './lib/github.js';
import Utils from './lib/Utils.js';
import HkGov from './lib/HkGov.js';


(
    async () => {

        // setup date for processing
        let date = DateTime.now().startOf('day');
        console.log(`init Date: ${date.toFormat('yyyy-MM-dd')}`);

        const dateInput = Args.getValue('date');
        if (dateInput) {
            const inputDate = DateTime.fromISO(dateInput);
            if (inputDate.isValid) {
                date = inputDate;
            }
        }
        console.log(`curr Date: ${date.toFormat('yyyy-MM-dd')}`);

        // get holidays
        const holidays = await HkGov.getHolidayList();
        if (holidays.find(x => x.date === date.toFormat('yyyyMMdd')) !== undefined) {
            console.log(`skip on holiday: ${date.toFormat('yyyy-MM-dd')}`)
            process.exit(0)
        }
        // exit if sat and sun
        if (date.weekday === 6 || date.weekday === 7) {
            console.log(`skip on sat and sun: ${date.toFormat('yyyy-MM-dd')} (${date.toFormat('ccc')})`)
            process.exit(0)
        }

        // Loop for 3 main index
        const idxList = ['hsi', 'hscei', 'hstech']
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
            }

            if (fs.existsSync(pdfToProcess)) {

                const indexJsonData = await Hsi.getDataFromPdf({ filePath: pdfToProcess, index: _idx, date: date.toFormat('yyyyMMdd') })
                fs.writeFileSync(jsonToProcess, JSON.stringify(indexJsonData, null, 2));

                console.log(`process to upload file: ${pdfToProcess}`)
                await github.uploadConstituentsPdf({ path: `hkex/constituents/pdf/${filename}.pdf`, filePath: pdfToProcess });
                await Utils.delay(1000);
                await github.uploadConstituentsPdf({ path: `hkex/constituents/json/${filename}.json`, filePath: jsonToProcess });
                await Utils.delay(1000);
                if (Args.getValue('keep') !== 'true') {
                    fs.rmSync(pdfToProcess);
                    fs.rmSync(jsonToProcess);
                }
            }
        }
        process.exit(0)
    }
)();
