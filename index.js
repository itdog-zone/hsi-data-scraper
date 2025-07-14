import 'dotenv/config';
import Utils from './lib/Utils.js';
import Process from './tasks/Process.js';
import HsiProcess from './tasks/HsiProcess.js';
import HkexProcess from './tasks/HkexProcess.js';
import IndexConstituentsAnalysis from './tasks/IndexConstituentsAnalysis.js';


(
    async () => {
        console.log('Running with Node.js version:', process.version);

        // -------------------------------------------
        // Initialize Process Object
        // -------------------------------------------
        const proc = Process.getInstance();
        await proc.init();
        const dateList = proc.getDateList()


        // Validate date list having data
        if (dateList.length === 0) {
            const msg = `No date process`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
            process.exit(0)
        }

        // -------------------------------------------
        // tasks for hsi.com.hk 
        // -------------------------------------------
        const hsiProcess = new HsiProcess({ dateList: dateList });
        const hsiFileList = await hsiProcess.extractDataFromHsi();

        // -------------------------------------------
        // tasks for hkex.com.hk 
        // -------------------------------------------
        // const hkexProcess = new HkexProcess({ dateList: dateList});
        // const hkexFileList = await hkexProcess.extractDataFromHkex();


        // -------------------------------------------
        // Make simple analysis (WIP) 
        // -------------------------------------------
        // const indexConstituents = hsiFileList.reduce((acc, cur) => {
        //     acc[cur.indexCode] = { constituents: cur.data }
        //     return acc
        // }, {});
        // const indexQuotations = (hkexFileList || []).length > 0 ? hkexFileList[0].data.quotations : [];
        // const indexConstituentsAnalysis = new IndexConstituentsAnalysis({ indexConstituents: indexConstituents, indexQuotations: indexQuotations });
        // const indexConstituentsAnalysisResult = indexConstituentsAnalysis.analysisData();

        {
            const msg = `process done at: ${dateList.map(x => `${x.toFormat('yyyy-MM-dd')} ${x.toFormat('ccc')}`).join(', ')}`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
        }
        process.exit(0)
    }
)();
