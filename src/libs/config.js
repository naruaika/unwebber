const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const schema = {
    project: {
        current: {
            path: null,
            name: null,
            isSaved: null,
            isTemp: null,
        },
        recent: {
            paths: [],
        },
    }
};

const validate = (appConfig, schema) => {
    for (const key in schema) {
        if (! appConfig[key]) {
            appConfig[key] = schema[key];
        } else {
            for (const subkey in schema[key]) {
                if (! appConfig[key][subkey]) {
                    appConfig[key][subkey] = schema[key][subkey];
                }
            }
        }
    }
};

const read = () => {
    // Get user data directory path
    const userData = app.getPath('userData');
    const configPath = path.join(userData, 'config.json');

    let appConfig = {};

    try {
        // Read the app configuration file
        appConfig = JSON.parse(fs.readFileSync(configPath));
        console.debug(`Application config file loaded from ${configPath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Create the configuration file if it doesn't exist
            fs.writeFileSync(configPath, JSON.stringify(appConfig));
            console.debug(`Application config file created at ${configPath}`);
        } else {
            console.error(error);
        }
    }

    // Validate the configuration
    validate(appConfig, schema);

    return appConfig;
};

const write = (appConfig) => {
    // Get user data directory path
    const userData = app.getPath('userData');
    const configPath = path.join(userData, 'config.json');

    // Validate the configuration
    validate(appConfig, schema);

    // Save the updated configuration
    fs.writeFileSync(configPath, JSON.stringify(appConfig));
    console.debug(`Configuration file saved to ${configPath}`);
};

// Alias for read() function
const load = () => read();

module.exports = { read, write, load };
