import fs from 'fs';
import ENum from "../lib/ENum.js"
import GitHub from "../lib/Github.js"
import Utils from "../lib/Utils.js"
import Hkex from '../lib/Hkex.js';
import Args from '../lib/Args.js';

export default class HkexProcess {
    constructor(args) {
        args = args || {}
        this.dateList = args.dateList || []
    }

    extractDataFromHkex = async () => {
        // create file list for processing
        const fileList = []
        for (const dd of this.dateList) {
            const filename = `${dd.toFormat('yyyyMMdd')}_hkex_dayquot`
            fileList.push({
                source: 'hkex',
                sourceType: ENum.SOURCE_TYPE.HTML_BODY_TEXT_CONTENT,
                fileType: ENum.FILE_TYPE.DAYQUOT,
                date: dd,
                fromFile: `https://www.hkex.com.hk/chi/stat/smstat/dayquot/d${dd.toFormat('yyMMdd')}c.htm`,
                downloadFile: `./download/${filename}.txt`,
                jsonFile: `./download/${filename}.json`,
                githubFilePath: `hkex/dayquot/txt/${filename}.txt`,
                githubJsonPath: `hkex/dayquot/json/${filename}.json`,
            })
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
            const hkex = new Hkex({});
            await hkex.downloadFiles({ fileList: fileList });
            console.log(`process to download file at: ${fileList.map(x => x.date.toFormat('yyyy-MM-dd')).join(', ')}...done`)
        }

        // Loop for files
        const github = new GitHub({ owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, token: process.env.GITHUB_TOKEN });
        for (const fileInfo of fileList) {
            const fileToProcess = fileInfo.downloadFile
            const jsonToProcess = fileInfo.jsonFile

            // file exists, extract data to json and upload to github
            if (fs.existsSync(fileToProcess)) {
                console.log(`extract data: ${fileToProcess}`)
                const jsonData = await Hkex.getDataFromFile({ fileInfo: fileInfo })
                fs.writeFileSync(jsonToProcess, JSON.stringify(jsonData, null, 2));

                console.log(`process to upload file: ${fileToProcess}`)
                await github.uploadFile({ path: fileInfo.githubFilePath, filePath: fileToProcess });
                await Utils.delay(200);
                console.log(`process to upload file: ${jsonToProcess}`)
                await github.uploadFile({ path: fileInfo.githubJsonPath, filePath: jsonToProcess });
                await Utils.delay(200);
                if (Args.getValue('keep') !== 'true') {
                    fs.rmSync(fileToProcess);
                    fs.rmSync(jsonToProcess);
                }
                fileInfo.processed = true
            }
        }

        return fileList
    }
}