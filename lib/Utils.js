export default class Utils {
    static delay = ms => new Promise(resolve => setTimeout(resolve, ms))
}
