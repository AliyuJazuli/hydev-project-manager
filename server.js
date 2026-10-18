/**
 * HYDEV Project Manager - Local Server
 *
 * Plain Node, no dependencies. Two jobs:
 *   1. Serve the app's static files.
 *   2. Expose POST /api/open, which actually launches VS Code, Android
 *      Studio, or the file explorer with a project's folder — something a
 *      browser tab can never fully guarantee on its own (custom URI schemes
 *      like vscode:// depend on the OS having that handler registered, and
 *      the page gets no reliable feedback if it isn't). Since this server
 *      runs locally on your own machine, it can just spawn the process
 *      directly.
 *
 * Bound to 127.0.0.1 only — not reachable from other devices on your
 * network. /api/open only ever launches a small fixed set of known
 * editors/explorers, passing the folder path as a single argument (never
 * through a shell string), so it can't be used to run arbitrary commands.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

// ---------------------------------------------------------------------------
// Launching external apps
// ---------------------------------------------------------------------------

/**
 * Try each candidate command in turn. A candidate is either a bare command
 * name (resolved via PATH) or a full path to an executable. Resolves with
 * the command that actually started, or rejects if none of them did.
 */
function trySpawn(candidates, args) {
    return new Promise((resolve, reject) => {
        const attempt = (i) => {
            if (i >= candidates.length) {
                reject(new Error('none of the expected install locations had it'));
                return;
            }
            const cmd = candidates[i];
            let settled = false;
            const child = spawn(cmd, args, {
                detached: true,
                stdio: 'ignore',
                shell: process.platform === 'win32'
            });

            child.once('error', () => {
                if (settled) return;
                settled = true;
                attempt(i + 1);
            });

            // If it didn't immediately error (ENOENT etc.), treat it as launched.
            // GUI apps don't exit promptly, so we don't wait for 'exit'.
            setTimeout(() => {
                if (settled) return;
                settled = true;
                child.unref();
                resolve(cmd);
            }, 400);
        };
        attempt(0);
    });
}

// A path must be absolute before we ever hand it to spawn(). Without this,
// a relative/bare folder name (which is all browsers can give us) resolves
// against THIS server's own working directory — silently opening the
// HYDEV app folder itself instead of the project. Better to refuse clearly.
const WIN_ABS = /^[A-Za-z]:[\\/]/;
const UNC_ABS = /^\\\\/;
const UNIX_ABS = /^\//;

function isAbsolutePath(p) {
    return WIN_ABS.test(p) || UNC_ABS.test(p) || UNIX_ABS.test(p);
}

// Checks whether a path is a real, accessible folder — and if not, tries to
// say *why* rather than just "doesn't exist". A few distinct failure modes
// get lumped into "doesn't exist" if we're not careful: a permissions error,
// the path pointing at a file instead of a folder, and — very commonly on
// Windows — "Documents" being a OneDrive-redirected library folder, where
// File Explorer shows a friendly path that isn't the real one on disk.
function diagnosePath(rawPath) {
    const targetPath = (rawPath || '').trim();
    if (!targetPath) return { exists: false, reason: 'empty' };
    if (!isAbsolutePath(targetPath)) return { exists: false, reason: 'not-absolute' };

    let stat;
    try {
        stat = fs.statSync(targetPath);
    } catch (err) {
        const looksLikeDocuments = /[\\/]Documents[\\/]/i.test(targetPath);
        return { exists: false, reason: err.code === 'ENOENT' ? 'not-found' : 'error', code: err.code, looksLikeDocuments };
    }
    if (!stat.isDirectory()) return { exists: false, reason: 'not-a-folder' };
    return { exists: true };
}

function describeDiagnosis(targetPath, diag) {
    if (diag.reason === 'empty') return 'No path entered yet.';
    if (diag.reason === 'not-absolute') return `"${targetPath}" isn't a complete path yet (needs a drive letter, like C:\\...).`;

    let message;
    if (diag.reason === 'not-a-folder') {
        message = `"${targetPath}" exists but is a file, not a folder.`;
    } else if (diag.code && diag.code !== 'ENOENT') {
        message = `Couldn't access "${targetPath}" (${diag.code}) — could be a permissions issue, or a drive/network path that isn't currently available.`;
    } else {
        message = `That folder doesn't exist: "${targetPath}". If your project is nested inside subfolders under your Projects Root, add the missing subfolders to the path.`;
    }
    if (diag.looksLikeDocuments) {
        message += ' Also: if this computer uses OneDrive, "Documents" is often redirected — check the real path in File Explorer\'s address bar (it may actually be under ...\\OneDrive\\Documents\\...).';
    }
    return message;
}

function openExplorer(targetPath) {
    if (process.platform === 'win32') return trySpawn(['explorer.exe'], [targetPath]);
    if (process.platform === 'darwin') return trySpawn(['open'], [targetPath]);
    return trySpawn(['xdg-open'], [targetPath]);
}

function getWindowsStandardPaths() {
    const userProfile = process.env.USERPROFILE || process.env.HOMEDRIVE && process.env.HOMEPATH
        ? path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)
        : 'C:\\Users\\Default';
    const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    return { userProfile, localAppData, programFiles, programFilesX86 };
}

function openVSCode(targetPath, customExecutable = null) {
    if (customExecutable) return trySpawn([customExecutable], [targetPath]);
    if (process.platform === 'win32') {
        const { localAppData, programFiles, programFilesX86 } = getWindowsStandardPaths();
        const candidates = [
            'code',
            'code.cmd',
            path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
            path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code'),
            path.join(programFiles, 'Microsoft VS Code', 'bin', 'code.cmd'),
            path.join(programFiles, 'Microsoft VS Code', 'bin', 'code'),
            path.join(programFilesX86, 'Microsoft VS Code', 'bin', 'code.cmd'),
            path.join(programFilesX86, 'Microsoft VS Code', 'bin', 'code'),
            path.join(programFiles, 'Microsoft VS Code', 'Code.exe'),
            path.join(programFilesX86, 'Microsoft VS Code', 'Code.exe')
        ];
        return trySpawn(candidates, [targetPath]);
    }
    // 'code' is on PATH when VS Code's installer option "Add to PATH" was used
    // (on by default on Windows/Mac/Linux installers).
    return trySpawn(['code'], [targetPath]);
}

function openAndroidStudio(targetPath, customExecutable = null) {
    if (customExecutable) return trySpawn([customExecutable], [targetPath]);
    if (process.platform === 'win32') {
        const { userProfile, localAppData, programFiles, programFilesX86 } = getWindowsStandardPaths();
        const candidates = [
            'studio64',
            'studio',
            path.join(localAppData, 'Programs', 'Android Studio', 'bin', 'studio64.exe'),
            path.join(localAppData, 'Programs', 'Android Studio', 'bin', 'studio.exe'),
            path.join(localAppData, 'JetBrains', 'Toolbox', 'apps', 'AndroidStudio', 'bin', 'studio64.exe'),
            path.join(localAppData, 'JetBrains', 'Toolbox', 'apps', 'AndroidStudio', 'bin', 'studio.exe'),
            path.join(userProfile, 'AppData', 'Local', 'Programs', 'Android Studio', 'bin', 'studio64.exe'),
            path.join(userProfile, 'AppData', 'Local', 'Programs', 'Android Studio', 'bin', 'studio.exe'),
            path.join(programFiles, 'Android', 'Android Studio', 'bin', 'studio64.exe'),
            path.join(programFiles, 'Android', 'Android Studio', 'bin', 'studio.exe'),
            path.join(programFilesX86, 'Android', 'Android Studio', 'bin', 'studio64.exe'),
            path.join(programFilesX86, 'Android', 'Android Studio', 'bin', 'studio.exe')
        ];
        return trySpawn(candidates, [targetPath]);
    }
    if (process.platform === 'darwin') {
        // -a with a full .app path also covers JetBrains Toolbox installs
        return trySpawn(['open'], ['-a', 'Android Studio', targetPath]);
    }
    // Linux: no fixed install location; rely on PATH (studio.sh symlinked by
    // JetBrains Toolbox, or the user's own install) or a Toolbox default.
    return trySpawn(
        ['studio.sh', 'studio', path.join(process.env['HOME'] || '', '.local/share/JetBrains/Toolbox/apps/AndroidStudio/bin/studio.sh')],
        [targetPath]
    );
}

// Best-effort "preview" for a web project: look for an index.html in a few
// conventional spots and open it with whatever the OS treats as the default
// browser/handler for .html files. This is not a dev server — it opens the
// static file as-is, so anything that needs a build step or a real server
// (most modern JS frameworks, API calls, routing) won't work right from it.
function openWebPreview(targetPath) {
    const candidates = ['index.html', 'public/index.html', 'dist/index.html', 'build/index.html']
        .map((rel) => path.join(targetPath, rel));
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
        return Promise.reject(new Error('no index.html found in the project root, public/, dist/, or build/'));
    }
    if (process.platform === 'win32') return trySpawn(['cmd'], ['/c', 'start', '', found]);
    if (process.platform === 'darwin') return trySpawn(['open'], [found]);
    return trySpawn(['xdg-open'], [found]);
}

const OPENERS = { explorer: openExplorer, vscode: openVSCode, 'android-studio': openAndroidStudio, 'preview-web': openWebPreview };
const FRIENDLY_NAMES = { explorer: 'File Explorer', vscode: 'VS Code', 'android-studio': 'Android Studio', 'preview-web': 'a browser preview' };

// ---------------------------------------------------------------------------
// HTTP handling
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
    });
    res.end(data);
}

function handleOpen(req, res) {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10_000) req.destroy(); // guard against absurd payloads
    });
    req.on('end', async () => {
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch {
            sendJson(res, 400, { ok: false, error: 'Malformed request.' });
            return;
        }

        const { tool, path: targetPath, executable } = parsed || {};
        const opener = OPENERS[tool];
        if (!opener) {
            sendJson(res, 400, { ok: false, error: `Unknown tool "${tool}".` });
            return;
        }
        if (!targetPath || typeof targetPath !== 'string') {
            sendJson(res, 400, { ok: false, error: 'No path provided.' });
            return;
        }

        // Folder-based tools (not preview-web, which checks for index.html
        // itself): confirm the path is real BEFORE spawning anything. Handing
        // an editor a path that doesn't exist can make it silently do
        // something unrelated (e.g. VS Code just focusing whatever window was
        // already open) instead of failing loudly — this way the person gets
        // a clear reason instead of a mysteriously wrong result.
        if (tool !== 'preview-web') {
            const diag = diagnosePath(targetPath);
            if (!diag.exists) {
                sendJson(res, 200, { ok: false, error: describeDiagnosis(targetPath.trim(), diag) });
                return;
            }
        }

        try {
            await opener(targetPath.trim(), executable && typeof executable === 'string' ? executable.trim() : null);
            sendJson(res, 200, { ok: true });
        } catch (err) {
            const message = tool === 'preview-web'
                ? `Couldn't preview this project: ${err.message}.`
                : `Couldn't find ${FRIENDLY_NAMES[tool]} on this computer (${err.message}). Is it installed?`;
            sendJson(res, 200, { ok: false, error: message });
        }
    });
}

function handleVerifyPath(req, res) {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10_000) req.destroy();
    });
    req.on('end', () => {
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch {
            sendJson(res, 400, { exists: false, message: 'Malformed request.' });
            return;
        }
        const targetPath = (parsed && parsed.path || '').trim();
        const diag = diagnosePath(targetPath);
        sendJson(res, 200, diag.exists
            ? { exists: true, message: 'Found — this folder exists.' }
            : { exists: false, message: describeDiagnosis(targetPath, diag) });
    });
}

function detectProjectType(targetPath) {
    const entries = new Set(fs.readdirSync(targetPath));
    const has = (...names) => names.some(name => entries.has(name));
    const packageJsonPath = path.join(targetPath, 'package.json');
    let packageData = {};

    if (entries.has('package.json')) {
        try {
            const parsedPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (parsedPackage && typeof parsedPackage === 'object' && !Array.isArray(parsedPackage)) {
                packageData = parsedPackage;
            }
        } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
        }
    }

    const dependencies = {
        ...(packageData.dependencies || {}),
        ...(packageData.devDependencies || {}),
        ...(packageData.peerDependencies || {})
    };

    const androidBuildFiles = [
        'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts',
        path.join('app', 'build.gradle'), path.join('app', 'build.gradle.kts')
    ];
    const hasAndroidManifest = entries.has('AndroidManifest.xml') || [
        path.join('app', 'src', 'main', 'AndroidManifest.xml'),
        path.join('src', 'main', 'AndroidManifest.xml')
    ].some(file => fs.existsSync(path.join(targetPath, file)));
    const hasAndroidPlugin = androidBuildFiles
        .filter(file => fs.existsSync(path.join(targetPath, file)))
        .map(file => fs.readFileSync(path.join(targetPath, file), 'utf8'))
        .some(contents => /com\.android\.(application|library)|android[.-](application|library)/.test(contents));

    if (hasAndroidManifest || hasAndroidPlugin) return 'Android';
    if (dependencies.next) return 'Next.js';
    if (dependencies.react) return 'React';
    if (dependencies.vue) return 'Vue';
    if (dependencies['@angular/core']) return 'Angular';
    if (dependencies.svelte) return 'Svelte';
    if (entries.has('package.json')) return 'Node.js';
    if (has('pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.py')) return 'Python';
    if (entries.has('Cargo.toml')) return 'Rust';
    if (entries.has('go.mod')) return 'Go';
    if ([...entries].some(name => /\.(csproj|sln)$/i.test(name))) return '.NET';
    if (entries.has('composer.json')) return 'PHP';
    if (entries.has('Gemfile')) return 'Ruby';
    if (has('pom.xml', 'build.gradle', 'build.gradle.kts')) return 'Java';
    if (entries.has('index.html')) return 'Web';
    return 'Other';
}

function handleProjectType(req, res) {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10_000) req.destroy();
    });
    req.on('end', () => {
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch {
            sendJson(res, 400, { error: 'Malformed request.' });
            return;
        }

        const targetPath = parsed && typeof parsed.path === 'string' ? parsed.path.trim() : '';
        const diagnosis = diagnosePath(targetPath);
        if (!diagnosis.exists) {
            sendJson(res, 400, { error: describeDiagnosis(targetPath, diagnosis) });
            return;
        }

        try {
            sendJson(res, 200, { type: detectProjectType(targetPath) });
        } catch (error) {
            console.error(`Failed to detect project type in "${targetPath}":`, error);
            sendJson(res, 500, { error: 'Could not inspect this project folder.' });
        }
    });
}

function serveStatic(req, res) {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/api/health') {
        sendJson(res, 200, { ok: true });
        return;
    }
    if (req.method === 'POST' && req.url === '/api/open') {
        handleOpen(req, res);
        return;
    }
    if (req.method === 'POST' && req.url === '/api/verify-path') {
        handleVerifyPath(req, res);
        return;
    }
    if (req.method === 'POST' && req.url === '/api/project-type') {
        handleProjectType(req, res);
        return;
    }
    if (req.method === 'GET') {
        serveStatic(req, res);
        return;
    }
    res.writeHead(405);
    res.end('Method not allowed');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`HYDEV Project Manager running at http://localhost:${PORT}`);
});