export default class HkGov {
    static getHolidayList = async () => {
        const res = await fetch('https://www.1823.gov.hk/common/ical/en.json', { method: 'GET' });
        const json = await res.json();
        // console.log(json)
        const calenders = json.vcalendar
        const holidays = []
        for (const calender of calenders) {
            for (const event of calender.vevent) {
                holidays.push({ date: event.dtstart[0], desc: event.summary })
            }
        }
        return holidays
    }
}