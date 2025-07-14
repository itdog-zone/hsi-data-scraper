import fs from 'fs';
import ENum from "../lib/ENum.js"
import GitHub from "../lib/Github.js"
import Hsi from "../lib/Hsi.js"
import Utils from "../lib/Utils.js"
import Args from '../lib/Args.js';

export default class HsiProcess {
    constructor(args) {
        args = args || {}
        this.dateList = args.dateList || []
    }

    extractDataFromHsi = async () => {
        // create file list for processing
        const idxList = ENum.HSI_INDEX_CODE_LIST
        const fileList = []
        for (const dd of this.dateList) {
            for (const _idx of idxList) {
                const filename = `${dd.toFormat('yyyyMMdd')}_${ENum.HSI_MAIN_INDEX_NAME[_idx]}`
                fileList.push({
                    source: 'hsi',
                    date: dd,
                    indexCode: _idx,
                    index: ENum.HSI_MAIN_INDEX_NAME[_idx],
                    fromFile: `https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/${ENum.HSI_MAIN_INDEX_NAME[_idx]}/constituents_${dd.toFormat('dLLLyy')}.pdf`,
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

                if (Args.getValue('skipGithub') !== 'true') {

                    console.log(`process to upload file: ${pdfToProcess}`)
                    await github.uploadFile({ path: fileInfo.githubPdfPath, filePath: pdfToProcess });
                    await Utils.delay(200);
                    console.log(`process to upload file: ${jsonToProcess}`)
                    await github.uploadFile({ path: fileInfo.githubJsonPath, filePath: jsonToProcess });
                    await Utils.delay(200);
                }
                
                if (Args.getValue('keep') !== 'true') {
                    fs.rmSync(pdfToProcess);
                    fs.rmSync(jsonToProcess);
                }
                fileInfo.data = indexJsonData
                fileInfo.processed = true
            }
        }

        return fileList
    }
}