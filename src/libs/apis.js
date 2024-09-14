const fs = require('node:fs');
const path = require('node:path');

const read = () => {
    // Get API schema file path
    const filePath = path.join(__dirname, '../apis/index.json');

    let apiSchema = {};

    try {
        // Read the API schema file
        apiSchema = JSON.parse(fs.readFileSync(filePath));
        console.debug(`Web API schema file loaded from ${filePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Create the API schema file if it doesn't exist
            fs.writeFileSync(filePath, JSON.stringify(apiSchema));
            console.debug(`Web API schema file created at ${filePath}`);
        } else {
            console.error(error);
        }
    }

    return apiSchema;
};

// Alias for read() function
const load = () => read();

module.exports = { read, load };
