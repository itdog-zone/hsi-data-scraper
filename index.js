import 'dotenv/config';
import Utils from './lib/Utils.js';
import Process from './tasks/Process.js';
import HsiProcess from './tasks/HsiProcess.js';
import HkexProcess from './tasks/HkexProcess.js';


(
    async () => {
        console.log('Running with Node.js version:', process.version);

        // -------------------------------------------
        // Initialize Process Object
        // -------------------------------------------
        const proc = new Process({});
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
        // const hsiProcess = new HsiProcess({ dateList: dateList });
        // const hsiFileList = await hsiProcess.extractDataFromHsi();

        // -------------------------------------------
        // tasks for hkex.com.hk 
        // -------------------------------------------
        const hkexProcess = new HkexProcess({ dateList: dateList });
        const hkexFileList = await hkexProcess.extractDataFromHkex();


        {
            const msg = `process done at: ${dateList.map(x => `${x.toFormat('yyyy-MM-dd')} ${x.toFormat('ccc')}`).join(', ')}`
            console.log(msg)
            await Utils.sendMessage({ msg: msg });
        }
        process.exit(0)
    }
)();
