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

        Utils.ensureDirExistsSync('./download');

        // Date list for batch processing
        const dateList = []

        // setup date for processing
        // data generate on next day 0100 -> scrape the previous day data
        // report is ready at the same day, but the time is not confirm

        // Handling Date Range process
        const argsFm = Args.getValue('from');
        const argsTo = Args.getValue('to');
        const dateFm = DateTime.fromISO(argsFm).isValid ? DateTime.fromISO(argsFm).startOf('day') : undefined;
        const dateTo = DateTime.fromISO(argsTo).isValid ? DateTime.fromISO(argsTo).startOf('day') : undefined;
        if (dateFm !== undefined && dateTo !== undefined && dateFm < dateTo) {
            let currentDate = dateFm;
            while (currentDate <= dateTo) {
                if (await Utils.isTradingDate(currentDate)) {
                    dateList.push(currentDate)
                }
                currentDate = currentDate.plus({ days: 1 });
            }
        }

        if (dateList.length === 0) {
            // args input, override the default date
            const dateInput = Args.getValue('date');
            const date = DateTime.fromISO(dateInput).isValid ? DateTime.fromISO(dateInput).startOf('day') : DateTime.now().startOf('day');
            if (await Utils.isTradingDate(date)) {
                dateList.push(date)
            }
            console.log(`process Date: ${date.toFormat('yyyy-MM-dd')} (${date.toFormat('ccc')})`);
        }

        // Show date list        
        for (const dd of dateList) {
            console.log(`${dd.toFormat('yyyy-MM-dd')} (${dd.toFormat('ccc')})`)
        }

        // Check if date list is empty
        if (dateList.length === 0) {
            const msg = `No date process`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
            process.exit(0)
        }

        // create file list for processing
        const fileList = []
        const idxList = ['hsi', 'hscei', 'hstech']
        for (const dd of dateList) {
            for (const _idx of idxList) {
                const filename = `${dd.toFormat('yyyyMMdd')}_${_idx}`
                fileList.push({
                    source: 'hsi',
                    date: dd,
                    index: _idx,
                    fromFile: `https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/${_idx}/constituents_${dd.toFormat('dLLLyy')}.pdf`,
                    downloadFile: `./download/${filename}.pdf`,
                    jsonFile: `./download/${filename}.json`,
                    githubPdfPath: `hkex/constituents/pdf/${filename}.pdf`,
                    githubJsonPath: `hkex/constituents/json/${filename}.json`,
                })
            }
        }
        // put another files if needed
        console.table(fileList)



        // Check if file exists
        let isFileNotExists = false
        for (const fileInfo of fileList) {
            if (!fs.existsSync(fileInfo.downloadFile)) {
                isFileNotExists = true
                break;
            }
        }

        // if some file not exists, process to download
        if (isFileNotExists) {
            console.log(`process to download file at: ${fileList.map(x => x.date.toFormat('yyyy-MM-dd')).join(', ')}...`)
            // process to download
            const hsi = new Hsi({ username: process.env.HSI_USERNAME, password: process.env.HSI_PASSWORD });
            await hsi.downloadConstituentsPdf({ fileList: fileList });
            console.log(`process to download file at: ${fileList.map(x => x.date.toFormat('yyyy-MM-dd')).join(', ')}...done`)
        }


        // Loop for files
        const github = new GitHub({ owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, token: process.env.GITHUB_TOKEN });
        for (const fileInfo of fileList) {
            // const filename = `${date.toFormat('yyyyMMdd')}_${_idx}`
            const pdfToProcess = fileInfo.downloadFile
            const jsonToProcess = fileInfo.jsonFile

            // file exists, extract data to json and upload to github
            if (fs.existsSync(pdfToProcess)) {
                console.log(`process to extract data: ${pdfToProcess}`)
                const indexJsonData = await Hsi.getDataFromPdf({ filePath: pdfToProcess, index: fileInfo.index, date: fileInfo.date.toFormat('yyyyMMdd') })
                fs.writeFileSync(jsonToProcess, JSON.stringify(indexJsonData, null, 2));

                console.log(`process to upload file: ${pdfToProcess}`)
                await github.uploadConstituentsPdf({ path: fileInfo.githubPdfPath, filePath: pdfToProcess });
                await Utils.delay(200);
                console.log(`process to upload file: ${jsonToProcess}`)
                await github.uploadConstituentsPdf({ path: fileInfo.githubJsonPath, filePath: jsonToProcess });
                await Utils.delay(200);
                if (Args.getValue('keep') !== 'true') {
                    fs.rmSync(pdfToProcess);
                    fs.rmSync(jsonToProcess);
                }
            }
        }

        {
            const msg = `process done at: ${fileList.map(x => `${x.date.toFormat('yyyy-MM-dd')} ${x.date.toFormat('ccc')}`).join(', ')}`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
        }
        process.exit(0)
    }
)();
