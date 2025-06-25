import 'dotenv/config';

export default class Tg {
    static getInstance = () => {
        if (!Tg.instance) {
            Tg.instance = new Tg({ token: process.env.TELEGRAM_BOT_TOKEN })
        }
        return Tg.instance
    }
    constructor(args) {
        args = args || {}
        this.token = args.token
    }

    sendMessage = async (args) => {
        args = args || {}
        const { chat_id, text } = args
        const url = `https://api.telegram.org/bot${this.token}/sendMessage?chat_id=${chat_id}&text=${text}`
        await fetch(url)
    }

    getUpdates = async () => {
        const url = `https://api.telegram.org/bot${this.token}/getUpdates`
        const res = await fetch(url)
        const json = await res.json()
        return json.result
    }
}