import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import Utils from './Utils.js';

export default class Hsi {
    static URL = {
        LOGIN: 'https://www.hsi.com.hk/eng/index360/login',
    }

    constructor(args) {
        args = args || {}
        const { username, password, date } = args
        this.args = { username, password, date }

        if (this.args.username === undefined || this.args.password === undefined || this.args.date === undefined) {
            throw new Error('username, password, date is required')
        }

    }

    downloadConstituentsPdf = async () => {

        // Launch browser
        const browser = await puppeteer.launch({ headless: false }); // Set headless: false for debugging
        const page = await browser.newPage();

        try {
            // Navigate to login page
            await page.goto('https://www.hsi.com.hk/eng/index360/login', { waitUntil: 'networkidle2' });

            await page.waitForSelector('[placeholder="Please enter your email"]', { timeout: 5000 });

            // input email
            // Find all elements with the placeholder
            const usernameFields = await page.$$('[placeholder="Please enter your email"]');

            // Check if any elements were found
            if (usernameFields.length === 0) {
                throw new Error('No username field found with the specified placeholder');
            }

            // Select the first matching element and type the username
            await usernameFields[0].type(this.args.username); // Replace with your username

            // input password
            // Find all elements with the placeholder
            const passwordFields = await page.$$('[placeholder="Please enter your password"]');

            // Check if any elements were found
            if (passwordFields.length === 0) {
                throw new Error('No password field found with the specified placeholder');
            }

            // Select the first matching element and type the password
            await passwordFields[0].type(this.args.password); // Replace with your password

            // Click login button
            await page.click('.log-on-bt');

            await page.waitForNavigation();

            await page.goto('https://www.hsi.com.hk/index360/eng/indexes', { waitUntil: 'networkidle2' });

            await Utils.delay(1000);

            const idxList = ['hsi', 'hscei', 'hstech']
            // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hsi/constituents_16Jun25.pdf
            // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hscei/constituents_17Jun25.pdf
            // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hstech/constituents_17Jun25.pdf

            for (const _idx of idxList) {
                // Fetch PDF content as binary
                const fileContent = await page.evaluate(async (_idx, dd) => {
                    // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hsi/constituents_03Jun25.pdf
                    // https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/hsi/constituents_2Jun25.pdf
                    const fetchFile = `https://www.hsi.com.hk/static/uploads/contents/en/indexes/report/${_idx}/constituents_${dd}.pdf`
                    const response = await fetch(fetchFile, {
                        method: 'GET',
                        credentials: 'include', // Include cookies for authenticated request
                    });
                    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
                    return Array.from(new Uint8Array(await response.arrayBuffer())); // Convert to array for serialization
                }, _idx, this.args.date.toFormat('dLLLyy'));

                // Save PDF file
                await fs.writeFile(`./download/${this.args.date.toFormat('yyyyMMdd')}_${_idx}.pdf`, Buffer.from(fileContent), 'binary');

                await Utils.delay(1000);

            }


        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            // Close browser
            // await browser.close();
        }


    }

}