'use strict'

global.eval = function() { throw new Error('bad!!'); }

const path = require('path');

const electron = require('electron');

// This adds refresh and devtools console keybindings
// Page can refresh with cmd+r, ctrl+r, F5
// Devtools can be toggled with cmd+alt+i, ctrl+shift+i, F12
require('electron-debug')({ enabled: true, showDevTools: false });

const { app } = electron;

const defaultURL = 'http://127.0.0.1:9000/';
let currentURL;

// Force everything localhost, in case of a leak
app.commandLine.appendSwitch('host-rules', 'MAP * 127.0.0.1');
app.commandLine.appendSwitch('ssl-version-fallback-min', 'tls1.2');
app.commandLine.appendSwitch('--no-proxy-server');
// app.commandLine.appendSwitch('cipher-suite-blacklist', '');

app.setAsDefaultProtocolClient('puebe');

// Module to create native browser window.
const { BrowserWindow } = electron;

const { dialog } = electron;

const childProcess = require('child_process');

const cwd = require('process').cwd();

console.log('working directory: ' + cwd);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

var puebe = null;

// function logExec(cmd, args) {
//     console.log('exec: ' + cmd);
//     var ps = childProcess.exec(cmd, args, (error) => {
//         if (error) {
//             console.log(error);
//             throw error
//         }
//     });
//     ps.stdout.on('data', (data) => {
//         console.log(data.toString());
//     });
//     ps.stderr.on('data', (data) => {
//         console.log(data.toString());
//     });
//     return ps;
// }

// logExec('ls');

function startPuebe() {
    console.log('Starting puebe from electron');

    // console.log('=====\n\n');
    // // console.log(app.getPath('app'));
    // console.log(app.getPath('puebe'));
    // console.log('\n\n=====');

    if (puebe) {
        console.log('Puebe already running');
        app.emit('puebe-ready');
        return
    }

    var reset = () => {
        puebe = null;
    }

    // Resolve puebe binary location
    var appPath = app.getPath('exe');
    var exe = (() => {
        switch (process.platform) {
            case 'darwin':
                return path.join(appPath, '../../Resources/app/puebe');
            case 'win32':
                // Use only the relative path on windows due to short path length
                // limits
                return './resources/app/puebe.exe';
            case 'linux':
                return path.join(path.dirname(appPath), './resources/app/puebe');
            default:
                return './resources/app/puebe';
        }
    })()
    var args = [
        '-launch-browser=false',
        '-gui-dir=' + path.dirname(exe),
        '-color-log=false', // must be disabled or web interface detection
        // will break
        // broken (automatically generated certs do not work):
        // '-web-interface-https=true',
    ]


    puebe = childProcess.spawn(exe, args);

    puebe.on('error', (e) => {
        dialog.showErrorBox('Failed to start puebe', e.toString());
        app.quit();
    });

    puebe.stdout.on('data', (data) => {
        console.log(data.toString());

        // Scan for the web URL string
        if (currentURL) {
            return
        }
        const marker = 'Starting web interface on ';
        var i = data.indexOf(marker);
        if (i === -1) {
            return
        }
        var j = data.indexOf('\n', i);

        // dialog.showErrorBox('index of newline: ', j);
        if (j === -1) {
            throw new Error('web interface url log line incomplete');
        }
        var url = data.slice(i + marker.length, j);
        currentURL = url.toString();
        app.emit('puebe-ready', { url: currentURL });
    });

    puebe.stderr.on('data', (data) => {
        console.log(data.toString());
    });

    puebe.on('close', (code) => {
        console.log('Puebe closed');
        reset();
    });

    puebe.on('exit', (code) => {
        console.log('Puebe exited');
        reset();
    });
}

function createWindow(url) {
    if (!url) {
        url = defaultURL;
    }

    // Create the browser window.
    win = new BrowserWindow({
        width: 1200,
        height: 900,
        title: 'Puebe',
        nodeIntegration: false,
        webPreferences: {
            webgl: false,
            webaudio: false,
        },
    });

    // patch out eval
    win.eval = global.eval;

    win.loadURL(url);

    // Open the DevTools.
    // win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
}

// Enforce single instance
const alreadyRunning = app.makeSingleInstance((commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    } else {
        createWindow(currentURL || defaultURL);
    }
});

if (alreadyRunning) {
    app.quit();
    return;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', startPuebe);

app.on('puebe-ready', (e) => {
    createWindow(e.url);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});

app.on('will-quit', () => {
    if (puebe) {
        puebe.kill('SIGINT');
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
