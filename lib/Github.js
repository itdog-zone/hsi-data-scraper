import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';

export default class GitHub {
    static URL = {
        LOGIN: 'https://www.hsi.com.hk/eng/index360/login',
    }

    constructor(args) {
        args = args || {}
        const { owner, repo, token } = args
        // check args undefined

        if (owner === undefined || repo === undefined || token === undefined) {
            throw new Error('owner, repo and token are required')
        }

        this.octokit = new Octokit({ auth: token });
        this.owner = owner; // Replace with your GitHub username
        this.repo = repo; // Replace with your repository name
        // this.path = 'hkex/constituents/pdf/20250618_hsi.pdf'; // Path in repo (e.g., 'data/output.txt' for subfolder)
        // this.filePath = './download/20250618_hsi.pdf'; // Local file path

    }

    uploadFile = async (args) => {
        args = args || {}
        const { path, filePath } = args

        try {
            // Read file content
            const content = await fs.readFile(filePath);
            const contentEncoded = content.toString('base64');
            const owner = this.owner;
            const repo = this.repo;

            // Check if file exists to update or create
            let sha;
            try {
                const { data } = await this.octokit.repos.getContent({
                    owner,
                    repo,
                    path,
                });
                sha = data.sha; // File exists, get SHA for update
            } catch (error) {
                if (error.status !== 404) throw error; // 404 means file doesn’t exist
            }

            // Upload or update file
            await this.octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message: `Upload ${path} on ${new Date().toISOString()}`,
                content: contentEncoded,
                sha, // Include SHA if updating
            });

            console.log(`File ${path} uploaded successfully!`);
        } catch (error) {
            console.error('Error uploading file:', error.message);
        }
    }
}