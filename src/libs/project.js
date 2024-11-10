const { app, BrowserWindow } = require('electron')
const os = require('node:os')
const fs = require('node:fs')
const path = require('node:path')

const pages = require('../pages')
const config = require('./config')

const schema = {
    name: null,
    description: null,
    version: null,
    entrypoint: null,
};

const validate = (projectSign, schema) => {
    for (const key in schema) {
        if (! projectSign[key]) {
            projectSign[key] = schema[key];
        } else {
            for (const subkey in schema[key]) {
                if (! projectSign[key][subkey]) {
                    projectSign[key][subkey] = schema[key][subkey];
                }
            }
        }
    }
};

const create = () => {
    // Get temporary directory path
    const tempDir = app.getPath('temp');
    let workDir = path.join(`${tempDir}${path.sep}`, 'unwebber-');

    try {
        // Create temporary workspace directory
        workDir = fs.mkdtempSync(workDir);
        console.debug(`Created temporary workspace directory at ${workDir}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    try {
        // Copy project templates into workspace
        fs.cpSync(path.join(__dirname, '../../res/templates/project'), workDir, { recursive: true });
        console.debug(`Copied project templates into ${workDir}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Open the project
    open(null, workDir);
};

const open = (_, workDir) => {
    const signaturePath = path.join(workDir, '.unwebber', 'signature.json');

    let signature = {};

    // Read the project signature
    try {
        signature = JSON.parse(fs.readFileSync(signaturePath));
        console.debug(`Project signature loaded from ${signaturePath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Validate the project signature
    validate(signature, schema);

    // Load the app configuration
    const appConfig = config.read();

    // Update current project details
    appConfig.project.current = {
        path: workDir,
        signature: signature,
        cursor: signature.entrypoint,
        isSaved: true,
        isTemp: workDir.startsWith(app.getPath('temp')),
    };

    // Append to the recent project list
    appConfig.project.recent.paths = [
        workDir,
        ...appConfig.project.recent.paths.slice(0, 2),
    ];

    // Create temporary files
    const dIndexRelativePath = signature.entrypoint.replace('.html', '.d.html');
    try {
        const indexPath = path.join(workDir, signature.entrypoint);
        const dIndexPath = path.join(workDir, dIndexRelativePath);
        fs.copyFileSync(indexPath, dIndexPath);
        console.debug(`Copied ${indexPath} to ${dIndexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Remove all missing resource references from the temporary file
    // FIXME: how to make the user aware of the missing files?
    try {
        const dIndexPath = path.join(workDir, dIndexRelativePath);
        let dIndexContent = fs.readFileSync(dIndexPath, 'utf-8');

        // Check for missing script files
        const scriptTags = dIndexContent.match(/<script[^>]*src="([^"]*)"[^>]*><\/script>/g);
        if (scriptTags) {
            for (let i = 0; i < scriptTags.length; i++) {
                const scriptTag = scriptTags[i];
                const scriptPath = scriptTag.match(/<script[^>]*src="([^"]*)"[^>]*><\/script>/)[1];
                if (! fs.existsSync(path.join(workDir, scriptPath))) {
                    dIndexContent = dIndexContent.replace(scriptTag, '');
                    console.debug(`Removed ${scriptPath} reference from ${dIndexPath} due to missing file`);
                }
            }
        }

        // Check for missing link files
        const linkTags = dIndexContent.match(/<link[^>]*href="([^"]*)"[^>]*>/g);
        if (linkTags) {
            for (let i = 0; i < linkTags.length; i++) {
                const linkTag = linkTags[i];
                const linkPath = linkTag.match(/<link[^>]*href="([^"]*)"[^>]*>/)[1];
                if (! fs.existsSync(path.join(workDir, linkPath))) {
                    dIndexContent = dIndexContent.replace(linkTag, '');
                    console.debug(`Removed ${linkPath} reference from ${dIndexPath} due to missing file`);
                }
            }
        }

        // Write the updated content
        fs.writeFileSync(dIndexPath, dIndexContent);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Attach editor files to the temporary file
    try {
        const dIndexPath = path.join(workDir, dIndexRelativePath);
        const editorJsPath = path.join(__dirname, '../debs/editor.js');
        const editorCssPath = path.join(__dirname, '../debs/editor.css');

        const editorJsTag = `<script data-uw-ignore src="${editorJsPath}"></script>`;
        const editorCssTag = `<link data-uw-ignore rel="stylesheet" href="${editorCssPath}">`;

        const indexContentUpdated = fs.readFileSync(dIndexPath, 'utf-8')
            .replace('</head>', `    ${editorCssTag}${os.EOL}</head>`)
            .replace('</body>', `    ${editorJsTag}${os.EOL}</body>`);

        fs.writeFileSync(dIndexPath, indexContentUpdated);
        console.debug(`Attached editor files to ${dIndexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Update the project file cursor
    appConfig.project.current.cursor = dIndexRelativePath;

    // Save the updated configuration
    config.write(appConfig);

    // Go to editor page
    BrowserWindow.getFocusedWindow().webContents.loadFile(pages.editor);
};

const close = () => {
    // Load the app configuration
    const appConfig = config.read();

    // Delete temporary files of the current project
    try {
        const indexPath = path.join(
            appConfig.project.current.path,
            appConfig.project.current.cursor,
        );
        fs.rmSync(indexPath);
        console.debug(`Deleted ${indexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Append to the recent project list
    // or move the current project to the top
    appConfig.project.recent.paths = [
        appConfig.project.current.path,
        ...(
            appConfig.project.recent.paths
                .filter(path => path !== appConfig.project.current.path)
                .slice(0, 2)
        ),
    ];

    // Clear current project details
    appConfig.project.current = {};

    // Save the updated configuration
    config.write(appConfig);

    // Go to editor page
    BrowserWindow.getFocusedWindow()?.webContents.loadFile(pages.welcome);
};

// Return the project tree
const tree = (_, workDir) => {
    const buildTree = (dir) => {
        const tree = {
            name: path.basename(dir),
            type: 'directory',
            path: dir,
            children: [],
        };

        // Read the directory
        const files = fs.readdirSync(dir);

        // Iterate over the files
        for (const file of files) {
            const filePath = path.join(dir, file);
            const fileStat = fs.statSync(filePath);

            // Skip hidden files
            if (file.startsWith('.')) {
                continue;
            }

            // Add the file to the tree
            if (fileStat.isDirectory()) {
                tree.children.push(buildTree(filePath));
            } else {
                tree.children.push({
                    name: file,
                    type: 'file',
                    path: filePath,
                });
            }
        }

        return tree;
    };

    return buildTree(workDir);
}

module.exports = { create, open, close, tree };