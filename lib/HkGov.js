export default class HkGov {
    static holidays = undefined
    
    static getHolidayList = async () => {
        if (HkGov.holidays === undefined || (HkGov.holidays || []).length === 0) {
            const res = await fetch('https://www.1823.gov.hk/common/ical/en.json', { method: 'GET' });
            const json = await res.json();
            // console.log(json)
            const calenders = json.vcalendar
            HkGov.holidays = []
            for (const calender of calenders) {
                for (const event of calender.vevent) {
                    // holidays.push({ date: event.dtstart[0], desc: event.summary })
                    HkGov.holidays.push(event.dtstart[0])
                }
            }
        }
        return HkGov.holidays
    }
}