const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

/**
 * Default sidebar layout schema
 *
 * Note that the schema is subject to change in future.
 */
const defaultSidebarLayoutSchema = [
    {
        type: 'dock',
        position: 'left',
        children: [
            {
                type: 'tab',
                children: [
                    {
                        type: 'panel',
                        id: 'pages',
                        title: 'Pages',
                    },
                    {
                        type: 'panel',
                        id: 'outline',
                        title: 'Outline',
                    },
                    {
                        type: 'panel',
                        id: 'find-and-replace',
                        title: 'Find & Replace',
                    },
                ],
            },
            {
                type: 'tab',
                children: [
                    {
                        type: 'panel',
                        id: 'assets',
                        title: 'Assets',
                    },
                    {
                        type: 'panel',
                        id: 'templates',
                        title: 'Templates',
                    },
                    {
                        type: 'panel',
                        id: 'symbols',
                        title: 'Symbols',
                    },
                ],
            },
        ],
    },
    {
        type: 'dock',
        position: 'right',
        children: [
            {
                type: 'tab',
                children: [
                    {
                        type: 'panel',
                        id: 'fill-and-stroke',
                        title: 'Fill & Stroke',
                    },
                    {
                        type: 'panel',
                        id: 'swatches',
                        title: 'Swatches',
                    },
                    {
                        type: 'panel',
                        id: 'attributes',
                        title: 'Attributes',
                    },
                ],
            },
            {
                type: 'tab',
                children: [
                    {
                        type: 'panel',
                        id: 'character',
                        title: 'Character',
                    },
                    {
                        type: 'panel',
                        id: 'paragraph',
                        title: 'Paragraph',
                    },
                    {
                        type: 'panel',
                        id: 'text-styles',
                        title: 'Text Styles',
                    },
                ],
            },
            {
                type: 'tab',
                children: [
                    {
                        type: 'panel',
                        id: 'transform',
                        title: 'Transform',
                    },
                    {
                        type: 'panel',
                        id: 'navigator',
                        title: 'Navigator',
                    },
                    {
                        type: 'panel',
                        id: 'history',
                        title: 'History',
                    },
                ],
            },
        ],
    },
];

/**
 * Default application configuration schema
 *
 * This schema can be used to validate the application configuration.
 * If the configuration file doesn't exist or is invalid, this schema
 * will be used to create a new configuration file.
 *
 * Note that the sidebar layout configuration is not customizable yet.
 * In the future when the user can customize the sidebar layout,
 * we need to more carefully validate the configuration so that the user
 * will not lose their customizations but still get the new features.
 *
 * Note that the schema is subject to change in future.
 */
const schema = {
    // Application configuration
    app: {
        // Window configuration
        window: {
            size: {
                width: 1200,
                height: 800,
            },
            maximized: false,
        },

        // Layout configuration
        layout: {
            topbar: { show: true },
            controlbar: { show: true },
            contextbar: { show: true },
            toolbar: { show: true },
            sidebar: {
                show: true,
                contents: defaultSidebarLayoutSchema,
            },
            statusbar: { show: true },
        },
    },

    // Project configuration
    project: {
        current: {
            name: null,
            path: null,
            signature: null,
            cursor: null,
            isSaved: null,
            isTemp: null,
        },
        recent: {
            paths: [],
        },
    }
};

/**
 * Validates the application configuration
 *
 * This function will validate the application configuration
 * against the application configuration schema. If the configuration
 * is missing some properties or values, it will be filled with the
 * default values from the schema.
 *
 * Note that the sidebar layout configuration is not customizable yet.
 * In the future when the user can customize the sidebar layout,
 * we should implement a versioning system in the configuration file
 * so that we can update the configuration schema without losing
 * the user's customizations.
 *
 * @param {Object} appConfig - The application configuration object.
 * @param {Object} schema - The application configuration schema object.
 */
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

    // Force the default sidebar layout schema
    // TODO: implement the ability to customize the sidebar layout
    appConfig.app.layout.sidebar.contents = defaultSidebarLayoutSchema;
};

/**
 * Reads the application configuration from the file system
 *
 * This function reads the application configuration from the file system.
 * If the configuration file doesn't exist, it will be created with the
 * default configuration values. The configuration file will be validated
 * against the application configuration schema.
 *
 * Since the current implementation for creating a new project puts
 * the project folder at the system's temporary directory, it is possible
 * that the project folder is deleted by the system or the user. In this case,
 * the recent project paths will be updated to remove the invalid paths.
 *
 * @returns {Object} The application configuration object.
 */
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

    // Verify if the recent project paths are valid
    appConfig.project.recent.paths = appConfig.project.recent.paths.filter((projectPath) => {
        return fs.existsSync(projectPath);
    });

    // Remove duplicate recent project paths
    appConfig.project.recent.paths = appConfig.project.recent.paths.filter((projectPath, index, self) => {
        return index === self.indexOf(projectPath);
    });

    // Save the updated configuration
    write(appConfig);

    return appConfig;
};

/**
 * Writes the application configuration to the file system
 *
 * This function writes the application configuration to the file system.
 * The configuration will be validated against the application configuration
 * schema before being saved to the file system.
 *
 * @param {Object} appConfig - The application configuration object.
 */
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

/**
 * Loads the application configuration from the file system
 *
 * This function is basically an alias of the `read` function.
 *
 * @returns {Object} The application configuration object.
 */
const load = () => read();

module.exports = { read, write, load };
