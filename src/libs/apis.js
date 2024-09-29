const fs = require('node:fs');
const path = require('node:path');

const schema = () => {
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

const template = (_, templateId, className = 'element') => {
    // Get API template file path
    const filePath = path.join(__dirname, '../../res/templates', `${className}s`, `${templateId}.html`);

    // If the file path doesn't exist, return an empty string
    if (! fs.existsSync(filePath)) {
        console.error(`Web API template file not found at ${filePath}`);
        return '<div>[Empty]</div>';
    }

    let apiTemplate = '';

    try {
        // Read the API template file
        apiTemplate = fs.readFileSync(filePath, 'utf8');
        console.debug(`Web API template file loaded from ${filePath}`);
    } catch (error) {
        console.error(error);
    }

    return apiTemplate;
}

module.exports = { schema, template };
