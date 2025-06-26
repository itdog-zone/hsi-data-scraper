import 'dotenv/config';
import Tg from './Tg.js';
import HkGov from './HkGov.js';
import fs from 'fs';

export default class Utils {
    static delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    static sendMessage = async (args) => await Tg.getInstance().sendMessage({ chat_id: process.env.TELEGRAM_BOT_CHAT_ID, text: args.msg })
    static isTradingDate = async (date) => {
        if (!date) return false
        const holidayList = (await HkGov.getHolidayList() || [])
        const isHoliday = holidayList.includes(date.toFormat('yyyyMMdd'))
        const isWeekEnd = date.weekday === 6 || date.weekday === 7
        return !isWeekEnd && !isHoliday
    }
    static ensureDirExistsSync = (dirPath) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Directory ${dirPath} created.`);
        } else {
            console.log(`Directory ${dirPath} already exists.`);
        }
    }
}
