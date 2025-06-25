import 'dotenv/config';
import Tg from './Tg.js';

export default class Utils {
    static delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    static sendMessage = async (args) => await Tg.getInstance().sendMessage({chat_id: process.env.TELEGRAM_BOT_CHAT_ID, text: args.msg})
}
