const fs = require('node:fs');
const path = require('node:path');

/**
 * Web API schema to be used in the editor
 */
const schema = () => {
    // Get API schema file path
    const filePath = path.join(__dirname, '../../res/schemas/api.json');
    const folderPath = path.join(__dirname, '../../res/schemas');

    let schema = {};

    // Read the API schema file
    try {
        schema = JSON.parse(fs.readFileSync(filePath));
        for (const key in schema) {
            const dependencyFilePath = path.join(folderPath, schema[key]);
            try {
                schema[key] = JSON.parse(fs.readFileSync(dependencyFilePath));
            } catch (error) {
                console.error(error);
            }
        }
        console.debug(`Web API schema file loaded from ${filePath}`);
    } catch (error) {
        console.error(error);
    }

    return schema;
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

    let template = '';

    // Read the API template file
    try {
        template = fs.readFileSync(filePath, 'utf8');
        console.debug(`Web API template file loaded from ${filePath}`);
    } catch (error) {
        console.error(error);
    }

    return template;
}

/**
 * Predefined color palettes from well-known design systems,
 * such as HTML colors, Bootstrap, Tailwind CSS, etc.
 */
const palette = () => {
    // Get API palette file path
    const filePath = path.join(__dirname, '../../res/schemas/palette.json');

    let palette = {};

    // Read the API palette file
    try {
        palette = JSON.parse(fs.readFileSync(filePath));
        console.debug(`Application palette file loaded from ${filePath}`);
    } catch (error) {
        console.error(error);
    }

    return palette;
}

module.exports = { schema, template, palette };
