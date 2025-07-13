export default class IndexConstituentsAnalysis {
    constructor(args) {
        args = args || {}
        this.indexConstituents = args.indexConstituents || []
        this.indexQuotations = args.indexQuotations || []
    }

    analysisData = () => {
        const indexConstituents = this.indexConstituents;
        const indexQuotations = this.indexQuotations;
        for (const indexKey of Object.keys(indexConstituents)) {
            const indexInfo = indexConstituents[indexKey] || {}
            const constituents = indexInfo.constituents;

            const constituentsQuotations = [];
            for (const constituent of constituents) {
                const quotation = indexQuotations.find(x => x.symbol === constituent.stockCodeShort);
                if (quotation !== undefined) {
                    constituentsQuotations.push(quotation)
                }
            }

            indexInfo.quotations = constituentsQuotations
        }

        return indexConstituents
    }
}