import { DateTime } from "luxon";
import Args from "../lib/Args.js";
import Utils from "../lib/Utils.js";

export default class Process {
    static getInstance = () => {
        if (this.instance === undefined) {
            this.instance = new Process()
        }
        return this.instance
    }
    
    constructor(args) {
    }

    init = async () => {

        // Create download folder
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
        
        this.dateList = dateList
        this.isInit = true
    }

    getDateList = () => {
        return this.dateList
    }
}