const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

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

const schema = {
    app: {
        window: {
            size: {
                width: 1200,
                height: 800,
            },
            maximized: false,
        },
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


    // TODO: implement the ability to customize the sidebar layout
    appConfig.app.layout.sidebar.contents = defaultSidebarLayoutSchema;
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
