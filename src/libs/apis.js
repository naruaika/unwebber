const fs = require('node:fs');
const path = require('node:path');

const read = () => {
    // Get API index file path
    const filePath = path.join(__dirname, '../apis/index.json');

    let apiIndex = {};

    try {
        // Read the API index file
        apiIndex = JSON.parse(fs.readFileSync(filePath));
        console.debug(`Web API index file loaded from ${filePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Create the API index file if it doesn't exist
            fs.writeFileSync(filePath, JSON.stringify(apiIndex));
            console.debug(`Web API index file created at ${filePath}`);
        } else {
            console.error(error);
        }
    }

    return apiIndex;
};

// Alias for read() function
const load = () => read();

module.exports = { read, load };
