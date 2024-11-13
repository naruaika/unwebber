const fs = require('node:fs');
const path = require('node:path');

/**
 * Web API schema to be used in the editor
 */
const schema = () => {
    // Get API schema file path
    const filePath = path.join(__dirname, '../../res/schemas/api.json');

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

/**
 * Returns the template content as a string for the given identifiers
 *
 * @param {String} event - The IPC event object
 * @param {string} templateId - The template ID.
 *        It represents the file name of the template.
 *        When the className is 'element', it also represents the tag name of the element.
 * @param {string} className - The class name of the template.
 *        It is used to determine the directory name of the template file.
 *        The accepted values are 'component' and 'element'.
 * @returns {string} The template content as a string
 */
const template = (event, templateId, className = 'element') => {
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
