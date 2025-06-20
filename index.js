import fs from 'fs';
import 'dotenv/config';
import { DateTime } from 'luxon';
import Args from './lib/Args.js';
import Hsi from './lib/Hsi.js';
import GitHub from './lib/github.js';
import Utils from './lib/Utils.js';


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


        const idxList = ['hsi', 'hscei', 'hstech']
        const github = new GitHub({ owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, token: process.env.GITHUB_TOKEN });
        for (const _idx of idxList) {
            const filename = `${date.toFormat('yyyyMMdd')}_${_idx}.pdf`

            const fileToProcess = `./download/${filename}`

            if (!fs.existsSync(fileToProcess)) {
                console.log(`process to download file at: ${date.toFormat('yyyy-MM-dd')}`)
                // process to download
                const hsi = new Hsi({ username: process.env.HSI_USERNAME, password: process.env.HSI_PASSWORD, date });
                await hsi.downloadConstituentsPdf();
            }

            if (fs.existsSync(fileToProcess)) {
                console.log(`process to upload file: ${fileToProcess}`)
                await github.uploadConstituentsPdf({ path: `hkex/constituents/pdf/${filename}`, filePath: fileToProcess });
                await Utils.delay(1000);
                fs.rmSync(fileToProcess);
            }
        }

    }
)();
