export default class Args {
    static getValue = (flagName) => {
        const flag = `--${flagName}=`;
        const match = process.argv.find(arg => arg.startsWith(flag));
        return match ? match.slice(flag.length) : null;
    }
}

